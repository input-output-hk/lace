/* eslint-disable complexity */
/* eslint-disable unicorn/no-array-reduce */
import isEmpty from 'lodash/isEmpty';
import { ActivityDetailSlice, ZustandHandlers, BlockchainProviderSlice, WalletInfoSlice, SliceCreator } from '../types';
import { CardanoTxOut, Transaction, ActivityDetail, TransactionActivityDetail } from '../../types';
import { blockTransformer, inputOutputTransformer } from '../../api/transformers';
import { Wallet } from '@lace/cardano';
import { getTransactionTotalOutput } from '../../utils/get-transaction-total-output';
import { inspectTxValues } from '@src/utils/tx-inspection';
import { firstValueFrom } from 'rxjs';
import { getAssetsInformation } from '@src/utils/get-assets-information';
import { MAX_POOLS_COUNT } from '@lace/staking';
import { ActivityStatus, ActivityType } from '@lace/core';
import { formatDate, formatTime } from '@src/utils/format-date';

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

const transactionMetadataTransformer = (
  metadata: Wallet.Cardano.TxMetadata
): TransactionActivityDetail['activity']['metadata'] =>
  [...metadata.entries()].map(([key, value]) => ({ key: key.toString(), value: Wallet.cardanoMetadatumToObj(value) }));

const shouldIncludeFee = (
  type: ActivityType,
  delegationInfo: Wallet.Cardano.StakeDelegationCertificate[] | undefined
) =>
  !(
    type === 'delegationRegistration' ||
    // Existence of any (new) delegationInfo means that this "de-registration"
    // activity is accompanied by a "delegation" activity, which carries the fees.
    // However, fees should be shown if de-registration activity is standalone.
    (type === 'delegationDeregistration' && !!delegationInfo?.length)
  );

const getPoolInfos = async (poolIds: Wallet.Cardano.PoolId[], stakePoolProvider: Wallet.StakePoolProvider) => {
  const filters: Wallet.QueryStakePoolsArgs = {
    filters: {
      identifier: {
        _condition: 'or',
        values: poolIds.map((poolId) => ({ id: poolId }))
      }
    },
    pagination: {
      startAt: 0,
      limit: MAX_POOLS_COUNT
    }
  };
  const { pageResults: pools } = await stakePoolProvider.queryStakePools(filters);

  return pools;
};

/**
 * fetches asset information
 */
const buildGetActivityDetail =
  ({
    set,
    get
  }: ZustandHandlers<
    ActivityDetailSlice & BlockchainProviderSlice & WalletInfoSlice
  >): ActivityDetailSlice['getActivityDetail'] =>
  // eslint-disable-next-line max-statements, sonarjs/cognitive-complexity
  async ({ coinPrices, fiatCurrency }) => {
    const {
      blockchainProvider: { chainHistoryProvider, stakePoolProvider, assetProvider },
      inMemoryWallet: wallet,
      activityDetail,
      walletInfo
    } = get();

    if (activityDetail.type === 'rewards') {
      const { activity, status, type } = activityDetail;
      const poolInfos = await getPoolInfos(
        activity.rewards.map(({ poolId }) => poolId),
        stakePoolProvider
      );

      return {
        activity: {
          includedUtcDate: formatDate({ date: activity.spendableDate, format: 'MM/DD/YYYY', type: 'utc' }),
          includedUtcTime: `${formatTime({ date: activity.spendableDate, type: 'utc' })} UTC`,
          rewards: {
            totalAmount: Wallet.util.lovelacesToAdaString(
              Wallet.BigIntMath.sum(activity.rewards?.map(({ rewards }) => rewards) || []).toString()
            ),
            spendableEpoch: activity.spendableEpoch,
            rewards: activity.rewards.map((r) => {
              const poolInfo = poolInfos.find((p) => p.id === r.poolId);
              return {
                amount: Wallet.util.lovelacesToAdaString(r.rewards.toString()),
                pool: r.poolId
                  ? {
                      id: r.poolId,
                      name: poolInfo?.metadata?.name || '-',
                      ticker: poolInfo?.metadata?.ticker || '-'
                    }
                  : undefined
              };
            })
          }
        },
        status,
        type
      };
    }

    const { activity: tx, status, type, direction } = activityDetail;
    const walletAssets = await firstValueFrom(wallet.assetInfo$);
    const protocolParameters = await firstValueFrom(wallet.protocolParameters$);
    set({ fetchingActivityInfo: true });

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

    let transaction: ActivityDetail['activity'] = {
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
      const pools = await getPoolInfos(
        delegationInfo.map(({ poolId }) => poolId),
        stakePoolProvider
      );

      if (pools.length === 0) {
        console.error('Stake pool was not found for delegation tx');
      } else {
        transaction = {
          ...transaction,
          pools: pools.map((pool) => ({
            name: pool.metadata?.name || '-',
            ticker: pool.metadata?.ticker || '-',
            id: pool.id.toString()
          }))
        };
      }
    }

    set({ fetchingActivityInfo: false });
    return { activity: transaction, blocks, status, assetAmount, type };
  };

/**
 * has all transactions search related actions and states
 */
export const activityDetailSlice: SliceCreator<
  ActivityDetailSlice & BlockchainProviderSlice & WalletInfoSlice,
  ActivityDetailSlice
> = ({ set, get }) => ({
  activityDetail: undefined,
  fetchingActivityInfo: true,
  getActivityDetail: buildGetActivityDetail({ set, get }),
  setTransactionActivityDetail: ({ activity, direction, status, type }) =>
    set({ activityDetail: { activity, direction, status, type } }),
  setRewardsActivityDetail: ({ activity }) =>
    set({ activityDetail: { activity, status: ActivityStatus.SPENDABLE, type: 'rewards' } }),
  resetActivityState: () => set({ activityDetail: undefined, fetchingActivityInfo: false })
});
