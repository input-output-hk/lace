/* eslint-disable functional/prefer-immutable-types */
import { useEffect, useMemo, useState } from 'react';

import {
  assetsMintedInspector,
  assetsBurnedInspector,
  delegationInspector,
  poolRetirementInspector,
  poolRegistrationInspector,
  coalesceValueQuantities,
  Serialization,
} from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';

import { useCommonOutsideHandles } from '../features/common-outside-handles-provider';
import { useOutsideHandles } from '../features/outside-handles-provider/useOutsideHandles';

import { toAsset } from './assets';

import type { OutsideHandlesContextValue } from '../features/outside-handles-provider/types';
import type { Asset as NamiAsset } from '../types/assets';
import type { Asset, Cardano } from '@cardano-sdk/core';
import type { HandleInfo } from '@cardano-sdk/wallet';
import type { Amount, TransactionDetail, TransactionInfo } from 'types';

export type AssetOrHandleInfo = Asset.AssetInfo | HandleInfo;
export type AssetOrHandleInfoMap = Map<Cardano.AssetId, AssetOrHandleInfo>;

export type Type =
  | 'externalIn'
  | 'externalOut'
  | 'internalIn'
  | 'internalOut'
  | 'multisig'
  | 'self';

interface UTxOList {
  inputs: Wallet.Cardano.HydratedTxIn[];
  collaterals?: Wallet.Cardano.HydratedTxIn[];
  outputs: Wallet.Cardano.TxOut[];
}

interface GetTxTypeProps {
  currentAddress: string;
  addresses: readonly string[];
  uTxOList: UTxOList;
}

const getTxType = ({
  currentAddress,
  addresses,
  uTxOList,
}: Readonly<GetTxTypeProps>): Type => {
  const inputsAddr = uTxOList.inputs.map(utxo => utxo.address);
  const outputsAddr = uTxOList.outputs.map(utxo => utxo.address);

  if (inputsAddr.every(addr => addr === currentAddress)) {
    // sender
    const internalOrExternalOut = outputsAddr.some(
      addr => addresses.includes(addr) && addr !== currentAddress,
    )
      ? 'internalOut'
      : 'externalOut';

    return outputsAddr.every(addr => addr === currentAddress)
      ? 'self'
      : internalOrExternalOut;
  } else if (inputsAddr.every(addr => addr !== currentAddress)) {
    // receiver
    return inputsAddr.some(addr => addresses.includes(addr))
      ? 'internalIn'
      : 'externalIn';
  }
  // multisig
  return 'multisig';
};

const dateFromUnix = (
  slot: Wallet.Cardano.Slot,
  eraSummaries: OutsideHandlesContextValue['eraSummaries'],
) => {
  const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
  const date = slotTimeCalc(slot);

  return date;
};

/**
 * Compile all required output to a flat amount list
 * @param {OutputList} outputList - The set of outputs requested for payment.
 * @return {AmountList} - The compiled set of amounts requested for payment.
 */
export const compileOutputs = (
  outputList: Readonly<UTxOList['outputs'] | Wallet.TxInput[]>,
): Amount[] => {
  const coalescedValue: Cardano.Value = coalesceValueQuantities(
    outputList.map(output => output.value),
  );

  return Array.from(coalescedValue?.assets ?? [], ([unit, quantity]) => ({
    unit: unit.toString(),
    quantity: quantity,
  })).concat({
    unit: 'lovelace',
    quantity: coalescedValue?.coins ?? BigInt(0),
  });
};

interface CalculatedAmount {
  unit: string;
  quantity: bigint;
}

interface CalculateAmountProps {
  currentAddress: string;
  uTxOList: {
    outputs: UTxOList['outputs'];
    collaterals: UTxOList['collaterals'];
    inputs: Wallet.TxInput[];
  };
  validContract: boolean;
}

const getAddressCredentials = (
  address: string,
): [
  Wallet.Crypto.Hash28ByteBase16 | undefined,
  Wallet.Crypto.Hash28ByteBase16 | undefined,
] => {
  const addr = Wallet.Cardano.Address.fromBech32(address);
  return [
    addr.getProps().paymentPart?.hash,
    addr.getProps().delegationPart?.hash,
  ];
};

const matchesAnyCredential = (
  address: Wallet.Cardano.PaymentAddress | undefined,
  [ownPaymentCred, ownStakingCred]: [
    Wallet.Crypto.Hash28ByteBase16 | undefined,
    Wallet.Crypto.Hash28ByteBase16 | undefined,
  ],
) => {
  if (!address) return false;
  const [otherPaymentCred, otherStakingCred] = getAddressCredentials(
    address.toString(),
  );
  return (
    otherPaymentCred === ownPaymentCred || otherStakingCred === ownStakingCred
  );
};

const calculateAmount = ({
  currentAddress,
  uTxOList,
  validContract = false,
}: CalculateAmountProps): CalculatedAmount[] => {
  const ownCredentials = getAddressCredentials(currentAddress);

  const inputs = compileOutputs(
    uTxOList.inputs.filter(
      ({ address, txId }) =>
        matchesAnyCredential(address, ownCredentials) &&
        !(uTxOList.collaterals?.find(c => c.txId === txId) && validContract),
    ),
  );
  const outputs = compileOutputs(
    uTxOList.outputs.filter(({ address }) =>
      matchesAnyCredential(address, ownCredentials),
    ),
  );
  const amounts: Amount[] = [];

  while (inputs.length > 0) {
    const input = inputs.pop()!;
    const outputIndex = outputs.findIndex(amount => amount.unit === input.unit);
    let qty;

    if (outputIndex > -1) {
      qty =
        (BigInt(input.quantity) - BigInt(outputs[outputIndex].quantity)) *
        BigInt(-1);
      outputs.splice(outputIndex, 1);
    } else {
      qty = BigInt(input.quantity) * BigInt(-1);
    }

    if (qty !== BigInt(0) || input.unit === 'lovelace')
      amounts.push({
        unit: input.unit,
        quantity: qty,
      });
  }

  return amounts.concat(outputs);
};

interface GetExtraProps {
  tx: Wallet.Cardano.HydratedTx;
  txType: Type;
  certificateInspectorFactory: OutsideHandlesContextValue['certificateInspectorFactory'];
  rewardAccountsAddresses: Set<Wallet.Cardano.RewardAccount>;
}

export type Extra =
  | 'contract'
  | 'delegation'
  | 'mint'
  | 'multisig'
  | 'poolRetire'
  | 'poolUpdate'
  | 'stake'
  | 'unstake'
  | 'withdrawal';

const getExtra = async ({
  tx,
  txType,
  certificateInspectorFactory,
  rewardAccountsAddresses,
}: GetExtraProps): Promise<Extra[]> => {
  const extra: Extra[] = [];

  if (tx.witness.redeemers?.length) {
    extra.push('contract');
  } else if (txType === 'multisig') {
    extra.push('multisig');
  }

  const withdrawal = tx.body.withdrawals?.find(w =>
    rewardAccountsAddresses.has(w.stakeAddress),
  );
  if (withdrawal) extra.push('withdrawal');

  const delegationCerts = await delegationInspector(tx);
  if (delegationCerts?.length) extra.push('delegation');

  const mintedAssets = await assetsMintedInspector(tx);
  const burnedAssets = await assetsBurnedInspector(tx);
  if (mintedAssets?.length || burnedAssets?.length) extra.push('mint');

  const stakeRegistrationCerts = await certificateInspectorFactory(
    Wallet.Cardano.CertificateType.StakeRegistration,
  )(tx);
  const registrationCerts = await certificateInspectorFactory(
    Wallet.Cardano.CertificateType.Registration,
  )(tx);
  if (stakeRegistrationCerts || registrationCerts) extra.push('stake');

  const stakeDeregCerts = await certificateInspectorFactory(
    Wallet.Cardano.CertificateType.StakeDeregistration,
  )(tx);
  const unregistrationCerts = await certificateInspectorFactory(
    Wallet.Cardano.CertificateType.Unregistration,
  )(tx);
  if (stakeDeregCerts || unregistrationCerts) extra.push('unstake');

  const poolRetireCerts = await poolRetirementInspector(tx);
  if (poolRetireCerts?.length) extra.push('poolRetire');

  const updateDelegateRepresentativeCerts = await poolRegistrationInspector(tx);
  if (updateDelegateRepresentativeCerts?.length) extra.push('poolUpdate');

  return extra;
};

const zeroLead = (str: number) => `0${str}`.slice(-2);
const getTimestamp = (date: Date) => {
  return `${date.getFullYear()}-${zeroLead(date.getMonth() + 1)}-${zeroLead(
    date.getDate(),
  )} ${zeroLead(date.getHours())}:${zeroLead(date.getMinutes())}:${zeroLead(
    date.getSeconds(),
  )}`;
};

export type TxInfo = Pick<TransactionDetail, 'metadata'> &
  Pick<TransactionInfo, 'deposit' | 'fees'> & {
    txHash: string;
    date: Date;
    timestamp: string;
    type: Type;
    extra: Extra[];
    amounts: CalculatedAmount[];
    lovelace: bigint;
    assets: NamiAsset[];
    refund: string;
  };

export interface EncodeToCborArgs {
  body: Wallet.Cardano.TxBody;
  witness?: Wallet.Cardano.Witness;
  auxiliaryData?: Wallet.Cardano.AuxiliaryData;
}

export const encodeToCbor = (args: EncodeToCborArgs): Serialization.TxCBOR => {
  const transaction = new Serialization.Transaction(
    Serialization.TransactionBody.fromCore(args.body),
    Serialization.TransactionWitnessSet.fromCore(
      args.witness
        ? (args.witness as Cardano.Witness)
        : { signatures: new Map() },
    ),
    args.auxiliaryData
      ? Serialization.AuxiliaryData.fromCore(args.auxiliaryData)
      : undefined,
  );

  return transaction.toCbor();
};

export const useTxInfo = (
  tx: Wallet.Cardano.HydratedTx | Wallet.TxInFlight,
): TxInfo | undefined => {
  const [txInfo, setTxInfo] = useState<TxInfo | undefined>();
  const {
    getTxInputsValueAndAddress,
    eraSummaries,
    walletAddresses,
    certificateInspectorFactory,
  } = useOutsideHandles();
  const { inMemoryWallet } = useCommonOutsideHandles();
  const protocolParameters = useObservable(inMemoryWallet.protocolParameters$);
  const assetsInfo = useObservable(inMemoryWallet.assetInfo$);
  const rewardAccounts = useObservable(
    inMemoryWallet.delegation.rewardAccounts$,
  );
  const rewardAccountsAddresses = useMemo(
    () => new Set(rewardAccounts?.map(a => a.address)),
    [rewardAccounts],
  );
  const currentAddress = walletAddresses[0];

  useEffect(() => {
    if (!protocolParameters || 'cbor' in tx) return;
    void (async () => {
      const implicitCoin = Wallet.Cardano.util.computeImplicitCoin(
        protocolParameters,
        tx.body,
      );
      const uTxOList = {
        inputs: tx.body.inputs,
        outputs: tx.body.outputs,
        collaterals: tx.body.collaterals,
      };
      const type = getTxType({
        currentAddress,
        addresses: walletAddresses,
        uTxOList,
      });
      const date = dateFromUnix(tx.blockHeader.slot, eraSummaries);
      const txInputs = await getTxInputsValueAndAddress(tx.body.inputs);
      const amounts = calculateAmount({
        currentAddress,
        uTxOList: { ...uTxOList, inputs: txInputs },
        validContract: tx.inputSource === Wallet.Cardano.InputSource.inputs,
      });
      const assets = amounts.filter(amount => amount.unit !== 'lovelace');
      const lovelaceAsset = amounts.find(amount => amount.unit === 'lovelace');
      const lovelace = BigInt(lovelaceAsset?.quantity ?? '');
      const deposit =
        Number.parseInt(implicitCoin.deposit?.toString() ?? '') > 0
          ? BigInt(implicitCoin.deposit?.toString() ?? 0)
          : BigInt(0);

      const info: TxInfo = {
        txHash: tx.id.toString(),
        fees: tx.body.fee.toString(),
        deposit: implicitCoin.deposit?.toString() ?? '',
        refund: implicitCoin.reclaimDeposit?.toString() ?? '',
        metadata: [...(tx.auxiliaryData?.blob?.entries() ?? [])].map(
          ([key, value]) => ({
            label: key.toString(),
            json_metadata: Wallet.cardanoMetadatumToObj(value),
          }),
        ),
        date,
        timestamp: getTimestamp(date),
        type,
        extra: await getExtra({
          tx,
          txType: type,
          certificateInspectorFactory,
          rewardAccountsAddresses,
        }),
        amounts: amounts,
        lovelace: ['internalIn', 'externalIn', 'multisig'].includes(type)
          ? BigInt(lovelace.toString())
          : BigInt(lovelace.toString()) +
            BigInt(tx.body.fee.toString()) +
            deposit,
        assets: assets
          .map(asset => {
            const assetInfo = assetsInfo?.get(
              Wallet.Cardano.AssetId(asset.unit),
            );
            if (!assetInfo) {
              console.error(`No asset info found for ${asset.unit}`);
            }
            return assetInfo ? toAsset(assetInfo, asset.quantity) : undefined;
          })
          .filter((a): a is NamiAsset => !!a),
      };

      setTxInfo(info);
    })();
  }, [
    protocolParameters,
    tx,
    currentAddress,
    getTxInputsValueAndAddress,
    assetsInfo,
  ]);

  return txInfo;
};
