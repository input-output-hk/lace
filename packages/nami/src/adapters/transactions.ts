/* eslint-disable functional/prefer-immutable-types */
import { useEffect, useState } from 'react';

import {
  assetsMintedInspector,
  assetsBurnedInspector,
  delegationInspector,
  poolRetirementInspector,
  coalesceValueQuantities,
} from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';

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

interface uTxOList {
  inputs: Wallet.Cardano.HydratedTxIn[];
  collaterals?: Wallet.Cardano.HydratedTxIn[];
  outputs: Wallet.Cardano.TxOut[];
}

interface GetTxTypeProps {
  currentAddress: string;
  addresses: readonly string[];
  uTxOList: uTxOList;
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
    return outputsAddr.every(addr => addr === currentAddress)
      ? 'self'
      : outputsAddr.some(
            addr => addresses.includes(addr) && addr !== currentAddress,
          )
        ? 'internalOut'
        : 'externalOut';
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
  outputList: Readonly<uTxOList['outputs'] | Wallet.TxInput[]>,
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
    outputs: uTxOList['outputs'];
    collaterals: uTxOList['collaterals'];
    inputs: Wallet.TxInput[];
  };
  validContract: boolean;
}

const calculateAmount = ({
  currentAddress,
  uTxOList,
  validContract = false,
}: CalculateAmountProps): CalculatedAmount[] => {
  const inputs = compileOutputs(
    uTxOList.inputs.filter(
      ({ address, txId }) =>
        address === currentAddress &&
        !(uTxOList.collaterals?.find(c => c.txId === txId) && validContract),
    ),
  );
  const outputs = compileOutputs(
    uTxOList.outputs.filter(({ address }) => address === currentAddress),
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
}: GetExtraProps): Promise<Extra[]> => {
  const extra: Extra[] = [];

  if (tx.witness.redeemers?.length) {
    extra.push('contract');
  } else if (txType === 'multisig') {
    extra.push('multisig');
  }

  if (tx.body.withdrawals?.length) extra.push('withdrawal');

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

  const updateDelegateRepresentativeCerts = await certificateInspectorFactory(
    Wallet.Cardano.CertificateType.UpdateDelegateRepresentative,
  )(tx);
  if (updateDelegateRepresentativeCerts) extra.push('poolUpdate');

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

export const useTxInfo = (
  tx: Wallet.Cardano.HydratedTx,
): TxInfo | undefined => {
  const [txInfo, setTxInfo] = useState<TxInfo | undefined>();
  const {
    getTxInputsValueAndAddress,
    inMemoryWallet,
    eraSummaries,
    walletAddresses,
    certificateInspectorFactory,
  } = useOutsideHandles();
  const protocolParameters = useObservable(inMemoryWallet.protocolParameters$);
  const assetsInfo = useObservable(inMemoryWallet.assetInfo$);
  const currentAddress = walletAddresses[0];

  useEffect(() => {
    if (!protocolParameters) return;
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
      const lovelace = BigInt(
        amounts.find(amount => amount.unit === 'lovelace')!.quantity,
      );

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
        }),
        amounts: amounts,
        lovelace: ['internalIn', 'externalIn', 'multisig'].includes(type)
          ? BigInt(lovelace.toString())
          : BigInt(lovelace.toString()) +
            BigInt(tx.body.fee.toString()) +
            (Number.parseInt(implicitCoin.deposit?.toString() ?? '') > 0
              ? BigInt(implicitCoin.deposit?.toString() ?? 0)
              : BigInt(0)),
        assets: assets.map(asset => {
          const assetInfo = assetsInfo?.get(Wallet.Cardano.AssetId(asset.unit));
          return toAsset(assetInfo!, asset.quantity);
        }),
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
