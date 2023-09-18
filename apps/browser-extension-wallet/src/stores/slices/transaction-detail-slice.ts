/* eslint-disable complexity */
/* eslint-disable unicorn/no-array-reduce */
import isEmpty from 'lodash/isEmpty';
import {
  TransactionDetailSlice,
  ZustandHandlers,
  BlockchainProviderSlice,
  WalletInfoSlice,
  SliceCreator
} from '../types';
import { CardanoTxOut, Transaction, TransactionDetail } from '../../types';
import { blockTransformer, inputOutputTransformer } from '../../api/transformers';
import { Wallet } from '@lace/cardano';
import { getTransactionTotalOutput } from '../../utils/get-transaction-total-output';
import { inspectTxValues } from '@src/utils/tx-inspection';
import { firstValueFrom } from 'rxjs';
import { getAssetsInformation } from '@src/utils/get-assets-information';
import { getRewardsAmount } from '@src/views/browser-view/features/activity/helpers';
import { MAX_POOLS_COUNT } from '@lace/staking';
import { TransactionType } from '@lace/core';

/**
 * validates if the transaction is confirmed
 */
const isConfirmedTransaction = (props: Transaction): props is Wallet.Cardano.HydratedTx =>
  (props as Wallet.Cardano.HydratedTx).blockHeader !== undefined;

/**
 * returns a list of assets ids that belong to the transaction
 */
const getTransactionAssetsId = (outputs: CardanoTxOut[]) => {
  const assetIds: Wallet.Cardano.AssetId[] = [];
  const assetMaps = outputs.map((output) => output.value.assets);
  for (const asset of assetMaps) {
    if (asset) {
      for (const id of asset.keys()) {
        !assetIds.includes(id) && assetIds.push(id);
      }
    }
  }
  return assetIds;
};

const transactionMetadataTransformer = (metadata: Wallet.Cardano.TxMetadata): TransactionDetail['tx']['metadata'] =>
  [...metadata.entries()].map(([key, value]) => ({ key: key.toString(), value: Wallet.cardanoMetadatumToObj(value) }));

const shouldIncludeFee = (
  type: TransactionType,
  delegationInfo: Wallet.Cardano.StakeDelegationCertificate[] | undefined
) =>
  !(
    type === 'delegationRegistration' ||
    // Existence of any (new) delegationInfo means that this "de-registration"
    // activity is accompanied by a "delegation" activity, which carries the fees.
    // However, fees should be shown if de-registration activity is standalone.
    (type === 'delegationDeregistration' && !!delegationInfo?.length)
  );

/**
 * fetchs asset information
 */
const getTransactionDetail =
  ({
    set,
    get
  }: ZustandHandlers<
    TransactionDetailSlice & BlockchainProviderSlice & WalletInfoSlice
  >): TransactionDetailSlice['getTransactionDetails'] =>
  // eslint-disable-next-line max-statements, sonarjs/cognitive-complexity
  async ({ coinPrices, fiatCurrency }) => {
    const {
      blockchainProvider: { chainHistoryProvider, stakePoolProvider, assetProvider },
      inMemoryWallet: wallet,
      transactionDetail: { tx, status, direction, type },
      walletInfo
    } = get();

    const walletAssets = await firstValueFrom(wallet.assetInfo$);
    const protocolParameters = await firstValueFrom(wallet.protocolParameters$);
    set({ fetchingTransactionInfo: true });

    // Assets
    const assetIds = getTransactionAssetsId(tx.body.outputs);
    const assetsInfo = await getAssetsInformation(assetIds, walletAssets, {
      assetProvider,
      extraData: { nftMetadata: true, tokenMetadata: true }
    });
    const tokensSize =
      inspectTxValues({ addresses: walletInfo.addresses, tx: tx as unknown as Wallet.Cardano.HydratedTx, direction })
        ?.assets?.size || 0;
    const assetAmount = tokensSize + 1;

    // Inputs
    const txInputs = await Wallet.getTxInputsValueAndAddress(tx.body.inputs, chainHistoryProvider, wallet);
    const inputs = txInputs.map((input) => inputOutputTransformer(input, assetsInfo, coinPrices, fiatCurrency));

    // Outputs
    const outputs = tx.body.outputs.map((output) =>
      inputOutputTransformer(output, assetsInfo, coinPrices, fiatCurrency)
    );
    const totalOutput = getTransactionTotalOutput(tx.body.outputs).minus(tx.body.fee.toString());
    const totalOutputInAda = Wallet.util.lovelacesToAdaString(totalOutput.toString());

    // Block Info
    const txBlock = isConfirmedTransaction(tx)
      ? await Wallet.getBlockInfoByHash(tx.blockHeader.hash, chainHistoryProvider, stakePoolProvider)
      : undefined;
    const blocks = txBlock ? blockTransformer(txBlock) : undefined;

    // Metadata
    const txMetadata = !isEmpty(tx.auxiliaryData?.blob)
      ? transactionMetadataTransformer(tx.auxiliaryData.blob)
      : undefined;

    // Transaction Costs
    const implicitCoin = Wallet.Cardano.util.computeImplicitCoin(protocolParameters, tx.body);
    const deposit =
      // since one tx can be split into two (delegation, registration) actions,
      // ensure only the registration tx carries the deposit
      implicitCoin.deposit && type === 'delegationRegistration'
        ? Wallet.util.lovelacesToAdaString(implicitCoin.deposit.toString())
        : undefined;
    const depositReclaimValue = Wallet.util.calculateDepositReclaim(implicitCoin);
    const depositReclaim =
      // since one tx can be split into two (delegation, de-registration) actions,
      // ensure only the de-registration tx carries the reclaimed deposit
      depositReclaimValue && type === 'delegationDeregistration'
        ? Wallet.util.lovelacesToAdaString(depositReclaimValue.toString())
        : undefined;
    const feeInAda = Wallet.util.lovelacesToAdaString(tx.body.fee.toString());

    // Delegation tx additional data (LW-3324)

    const delegationInfo = tx.body.certificates?.filter(
      (certificate) => certificate.__typename === 'StakeDelegationCertificate'
    ) as Wallet.Cardano.StakeDelegationCertificate[];

    let transaction: TransactionDetail['tx'] = {
      hash: tx.id.toString(),
      totalOutput: totalOutputInAda,
      fee: shouldIncludeFee(type, delegationInfo) ? feeInAda : undefined,
      deposit,
      depositReclaim,
      addrInputs: inputs,
      addrOutputs: outputs,
      metadata: txMetadata,
      includedUtcDate: blocks?.utcDate,
      includedUtcTime: blocks?.utcTime
    };

    if (type === 'delegation' && delegationInfo) {
      const filters: Wallet.QueryStakePoolsArgs = {
        filters: {
          identifier: {
            _condition: 'or',
            values: delegationInfo.map((certificate) => ({ id: certificate.poolId }))
          }
        },
        pagination: {
          startAt: 0,
          limit: MAX_POOLS_COUNT
        }
      };
      const { pageResults: pools } = await stakePoolProvider.queryStakePools(filters);

      if (pools.length === 0) {
        console.error('Stake pool was not found for delegation tx');
      } else {
        transaction = {
          ...transaction,
          pools: pools.map((pool) => ({
            name: pool.metadata.name || '-',
            ticker: pool.metadata.ticker || '-',
            id: pool.id.toString()
          }))
        };
      }
    }

    /*
      as we need to divide the transaction that withdrawn rewards in to two records,
      now we have a type rewards.
      When the record is of type rewards we will need to calculate the amount of rewards withdrawn
      and then adds this property rewards to the transaction information
    */
    if (type === 'rewards') {
      const rewards = getRewardsAmount(
        tx?.body?.withdrawals,
        walletInfo.addresses.map((addr) => addr.rewardAccount)
      );
      transaction = {
        ...transaction,
        rewards: Wallet.util.lovelacesToAdaString(rewards)
      };
    }

    set({ fetchingTransactionInfo: false });
    return { tx: transaction, blocks, status, assetAmount, type };
  };

/**
 * has all transactions search related actions and states
 */
export const transactionDetailSlice: SliceCreator<
  TransactionDetailSlice & BlockchainProviderSlice & WalletInfoSlice,
  TransactionDetailSlice
> = ({ set, get }) => ({
  transactionDetail: undefined,
  fetchingTransactionInfo: true,
  getTransactionDetails: getTransactionDetail({ set, get }),
  setTransactionDetail: (tx, direction, status, type) => set({ transactionDetail: { tx, direction, status, type } }),
  resetTransactionState: () => set({ transactionDetail: undefined, fetchingTransactionInfo: false })
});
