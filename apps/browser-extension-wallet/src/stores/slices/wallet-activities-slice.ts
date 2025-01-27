/* eslint-disable sonarjs/cognitive-complexity */
import flattenDeep from 'lodash/flattenDeep';
import uniq from 'lodash/uniq';
import { GetState, SetState } from 'zustand';
import BigNumber from 'bignumber.js';
import groupBy from 'lodash/groupBy';
import flatten from 'lodash/flatten';
import memoize from 'lodash/memoize';
import { Wallet } from '@lace/cardano';
import { Reward, Serialization, epochSlotsCalc } from '@cardano-sdk/core';
import {
  pendingTxTransformer,
  txHistoryTransformer,
  filterOutputsByTxDirection,
  isTxWithAssets,
  TransformedActivity,
  TransformedTransactionActivity
} from '@src/views/browser-view/features/activity/helpers';
import {
  ActivityAssetProp,
  ActivityStatus,
  AssetActivityItemProps,
  AssetActivityListProps,
  ConwayEraCertificatesTypes,
  DelegationActivityType
} from '@lace/core';
import { CurrencyInfo, TxDirections } from '@src/types';
import { getTxDirection, inspectTxType } from '@src/utils/tx-inspection';
import { assetTransformer } from '@src/utils/assets-transformers';
import {
  WalletActivitiesSlice,
  StateStatus,
  WalletInfoSlice,
  AssetDetailsSlice,
  ActivityDetailSlice,
  UISlice,
  BlockchainProviderSlice,
  SliceCreator
} from '../types';
import { getAssetsInformation } from '@src/utils/get-assets-information';
import { rewardHistoryTransformer } from '@src/views/browser-view/features/activity/helpers/reward-history-transformer';
import { isKeyHashAddress } from '@cardano-sdk/wallet';
import { ObservableWalletState } from '@hooks/useWalletState';
import { IBlockchainProvider } from './blockchain-provider-slice';
import { TX_HISTORY_LIMIT_SIZE } from '@utils/constants';

export interface FetchWalletActivitiesProps {
  fiatCurrency: CurrencyInfo;
  cardanoFiatPrice: number;
  sendAnalytics?: () => void;
  withLimitedRewardsHistory?: boolean;
}

interface FetchWalletActivitiesPropsWithSetter extends FetchWalletActivitiesProps {
  get: GetState<
    WalletInfoSlice &
      WalletActivitiesSlice &
      ActivityDetailSlice &
      AssetDetailsSlice &
      UISlice &
      BlockchainProviderSlice
  >;
  set: SetState<WalletActivitiesSlice>;
}

type ExtendedActivityProps = TransformedActivity & AssetActivityItemProps;

type extendedDelegationActivityType =
  | DelegationActivityType
  | ConwayEraCertificatesTypes.Registration
  | ConwayEraCertificatesTypes.Unregistration;

type DelegationActivityItemProps = Omit<ExtendedActivityProps, 'type'> & {
  type: extendedDelegationActivityType;
};

const isDelegationActivity = (activity: ExtendedActivityProps): activity is DelegationActivityItemProps =>
  activity.type in DelegationActivityType ||
  activity.type === ConwayEraCertificatesTypes.Registration ||
  activity.type === ConwayEraCertificatesTypes.Unregistration;

const getDelegationAmount = (activity: DelegationActivityItemProps) => {
  const fee = new BigNumber(Number.parseFloat(activity.fee));

  if (
    activity.type === DelegationActivityType.delegationRegistration ||
    activity.type === ConwayEraCertificatesTypes.Registration
  ) {
    return fee.plus(activity.deposit).negated();
  }

  if (
    activity.type === DelegationActivityType.delegationDeregistration ||
    activity.type === ConwayEraCertificatesTypes.Unregistration
  ) {
    return new BigNumber(activity.depositReclaim).minus(fee);
  }

  return fee.negated();
};

const FIAT_PRICE_DECIMAL_PLACES = 2;

const getFiatAmount = (amount: BigNumber, fiatPrice: number) =>
  fiatPrice ? amount.times(new BigNumber(fiatPrice)).toFormat(FIAT_PRICE_DECIMAL_PLACES) : '';

export const REWARD_SPENDABLE_DELAY_EPOCHS = 2;

export const getRewardSpendableDate = (
  spendableEpoch: Wallet.Cardano.EpochNo,
  eraSummaries: Wallet.EraSummary[]
): Date => {
  const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
  return slotTimeCalc(epochSlotsCalc(spendableEpoch, eraSummaries).firstSlot);
};

const initialState = {
  walletActivities: [] as AssetActivityListProps[],
  activitiesCount: 0,
  walletActivitiesStatus: StateStatus.IDLE
};

export const mapWalletActivities = memoize(
  async (
    {
      addresses,
      transactions,
      eraSummaries,
      protocolParameters,
      assetInfo,
      delegation: { rewardsHistory }
    }: ObservableWalletState,
    { fiatCurrency, cardanoFiatPrice, sendAnalytics, withLimitedRewardsHistory = false }: FetchWalletActivitiesProps,
    {
      assetDetails,
      assetProvider,
      cardanoCoin,
      setRewardsActivityDetail,
      setTransactionActivityDetail,
      isSharedWallet,
      inputResolver
    }: Pick<UISlice['walletUI'], 'cardanoCoin'> &
      Pick<ActivityDetailSlice, 'setRewardsActivityDetail' | 'setTransactionActivityDetail'> &
      Pick<AssetDetailsSlice, 'assetDetails'> &
      Pick<IBlockchainProvider, 'inputResolver'> &
      Pick<IBlockchainProvider, 'assetProvider'> &
      Pick<IBlockchainProvider, 'inputResolver'> &
      Pick<WalletInfoSlice, 'isSharedWallet'>
  ) => {
    const txHistorySlice = transactions.history.slice(-TX_HISTORY_LIMIT_SIZE);
    const epochRewardsMapper = (earnedEpoch: Wallet.Cardano.EpochNo, rewards: Reward[]): ExtendedActivityProps => {
      const spendableEpoch = (earnedEpoch + REWARD_SPENDABLE_DELAY_EPOCHS) as Wallet.Cardano.EpochNo;
      const rewardSpendableDate = getRewardSpendableDate(spendableEpoch, eraSummaries);

      const transformedEpochRewards = rewardHistoryTransformer({
        rewards,
        fiatCurrency,
        fiatPrice: cardanoFiatPrice,
        cardanoCoin,
        date: rewardSpendableDate
      });

      return {
        ...transformedEpochRewards,
        onClick: () => {
          if (sendAnalytics) sendAnalytics();
          setRewardsActivityDetail({
            activity: {
              rewards,
              spendableEpoch,
              spendableDate: rewardSpendableDate
            }
          });
        }
      };
    };

    const { resolveInput } = inputResolver;

    // eslint-disable-next-line unicorn/no-array-callback-reference
    const keyHashAddresses = addresses.filter(isKeyHashAddress);
    if (keyHashAddresses.length !== addresses.length) {
      throw new Error('TODO: implement script address support');
    }
    const historicTransactionMapper = async ({
      tx
    }: {
      tx: Wallet.Cardano.HydratedTx;
    }): Promise<ExtendedActivityProps[]> => {
      const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
      const date = slotTimeCalc(tx.blockHeader.slot);
      const transformedTransaction = await txHistoryTransformer({
        tx,
        walletAddresses: keyHashAddresses,
        fiatCurrency,
        fiatPrice: cardanoFiatPrice,
        date,
        protocolParameters,
        cardanoCoin,
        resolveInput,
        isSharedWallet
      });

      const extendWithClickHandler = (transformedTx: TransformedTransactionActivity) => ({
        ...transformedTx,
        onClick: () => {
          if (sendAnalytics) sendAnalytics();
          setTransactionActivityDetail({
            activity: tx,
            direction: transformedTx.direction,
            status: transformedTx.status,
            type: transformedTx.type
          });
        }
      });

      return transformedTransaction.map((tt) => extendWithClickHandler(tt));
    };

    const pendingTransactionMapper = async (
      tx: Wallet.TxInFlight | Wallet.KeyManagement.WitnessedTx,
      status?: Wallet.TransactionStatus
    ): Promise<ExtendedActivityProps[]> => {
      let date;
      if ('submittedAt' in tx) {
        try {
          const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
          date = slotTimeCalc(tx.submittedAt);
        } catch {
          date = new Date();
        }
      }
      const transformedTransaction = await pendingTxTransformer({
        tx,
        walletAddresses: keyHashAddresses,
        fiatPrice: cardanoFiatPrice,
        fiatCurrency,
        protocolParameters,
        cardanoCoin,
        date,
        resolveInput,
        status,
        isSharedWallet
      });

      const extendWithClickHandler = (transformedTx: TransformedTransactionActivity) => ({
        ...transformedTx,
        onClick: () => {
          if (sendAnalytics) sendAnalytics();
          const deserializedTx: Wallet.Cardano.Tx = Serialization.TxCBOR.deserialize(tx.cbor);
          setTransactionActivityDetail({
            activity: deserializedTx,
            direction: TxDirections.Outgoing,
            status: ActivityStatus.PENDING,
            type: transformedTx.type
          });
        }
      });

      return transformedTransaction.map((tt) => extendWithClickHandler(tt));
    };

    const filterTransactionByAssetId = async (txs: Wallet.Cardano.HydratedTx[]) => {
      const txsWithType = await Promise.all(
        txs.map(async (tx) => {
          const type = await inspectTxType({ walletAddresses: keyHashAddresses, tx, inputResolver, isSharedWallet });
          return { tx, type };
        })
      );
      return txsWithType.filter(({ tx, type }) => {
        const direction = getTxDirection({ type });
        const paymentAddresses: Wallet.Cardano.PaymentAddress[] = addresses.map((addr) => addr.address);
        return filterOutputsByTxDirection(tx.body.outputs, direction, paymentAddresses).some((output) =>
          isTxWithAssets(Wallet.Cardano.AssetId(assetDetails.id), output?.value?.assets)
        );
      });
    };

    /**
     * Sanitizes historical transactions data
     */
    const getHistoricalTransactions = async () => {
      const filtered =
        !assetDetails || assetDetails?.id === cardanoCoin.id
          ? txHistorySlice.map((tx) => ({ tx }))
          : await filterTransactionByAssetId(txHistorySlice);
      return flatten(await Promise.all(filtered.map((tx) => historicTransactionMapper(tx))));
    };

    /**
     * Sanitizes pending transactions data
     */
    const getPendingTransactions = async (): Promise<ExtendedActivityProps[]> =>
      flatten([
        ...(await Promise.all(transactions.outgoing.inFlight.map((tx) => pendingTransactionMapper(tx)))),
        ...(isSharedWallet
          ? await Promise.all(
              transactions.outgoing.signed.map((tx) =>
                pendingTransactionMapper(tx, Wallet.TransactionStatus.AWAITING_COSIGNATURES)
              )
            )
          : [])
      ]);

    /**
     * Sanitizes historical rewards data
     */
    const getRewardsHistory = (oldestHistoricalTxDate?: Date) =>
      Object.entries(groupBy(rewardsHistory.all, ({ epoch }) => epoch.toString()))
        .map(([epoch, rewards]) => epochRewardsMapper(Number(epoch) as Wallet.Cardano.EpochNo, rewards))
        .filter(
          (reward) =>
            reward.date.getTime() < Date.now() &&
            (!oldestHistoricalTxDate || reward.date.getTime() >= oldestHistoricalTxDate.getTime())
        );

    /**
     * Emits the lists combined and sets current state for Zustand
     */
    const [historicalTransactions, pendingTransactions] = await Promise.all([
      getHistoricalTransactions(),
      getPendingTransactions()
    ]);

    const oldestHistoricalTxDate = withLimitedRewardsHistory ? historicalTransactions[0]?.date : undefined;
    const rewards = assetDetails ? [] : getRewardsHistory(oldestHistoricalTxDate);

    const confirmedTxs = historicalTransactions;
    const pendingTxs = pendingTransactions;
    /* After the transaction is confirmed is not being removed from pendingTransactions$, so we have to remove it manually from pending list
      this is a workaround, as it seems to be an issue on the sdk side
      */
    const filteredPendingTxs = pendingTxs.filter((pending) =>
      confirmedTxs.some((confirmed) => confirmed?.id !== pending?.id)
    );

    const allTransactions = [...filteredPendingTxs, ...confirmedTxs, ...rewards];

    const allAssetsIds = uniq(
      flattenDeep(
        allTransactions.map(({ assets }: AssetActivityItemProps) =>
          assets.map(({ id }: ActivityAssetProp) => Wallet.Cardano.AssetId(id))
        )
      )
    );

    const assetsInfo = await getAssetsInformation(allAssetsIds, assetInfo, {
      assetProvider,
      extraData: {
        nftMetadata: true,
        tokenMetadata: true
      }
    });

    const allTransactionsTransformed = allTransactions.map((activity) => ({
      ...activity,
      ...(isDelegationActivity(activity) && {
        amount: `${getDelegationAmount(activity)} ${cardanoCoin.symbol}`,
        fiatAmount: `${getFiatAmount(getDelegationAmount(activity), cardanoFiatPrice)} ${fiatCurrency.code}`
      }),
      assets: activity.assets.map((asset: ActivityAssetProp) => {
        const assetId = Wallet.Cardano.AssetId(asset.id);
        const token = assetsInfo.get(assetId);
        const assetData = !token
          ? undefined
          : assetTransformer({
              token,
              key: assetId,
              total: { coins: BigInt(0), assets: new Map([[assetId, BigInt(asset.val)]]) },
              fiatCurrency
            });
        return {
          id: asset.id,
          val: Wallet.util.calculateAssetBalance(asset.val, token),
          info: {
            ticker: (assetData?.name !== '-' && assetData?.name) || assetData?.ticker
          }
        };
      })
    }));

    const allTransactionsGrouped = groupBy(
      allTransactionsTransformed.sort((firstTx, secondTx) => {
        // ensure txs that are awaiting cosignatures always come first
        if (
          firstTx.status === ActivityStatus.AWAITING_COSIGNATURES &&
          secondTx.status !== ActivityStatus.AWAITING_COSIGNATURES
        )
          return -1;
        if (
          secondTx.status === ActivityStatus.AWAITING_COSIGNATURES &&
          firstTx.status !== ActivityStatus.AWAITING_COSIGNATURES
        )
          return 1;

        // ensure pending tx's always appear on top, separated from the condition above for readability
        if (firstTx.status === ActivityStatus.PENDING && secondTx.status !== ActivityStatus.PENDING) return -1;
        if (secondTx.status === ActivityStatus.PENDING && firstTx.status !== ActivityStatus.PENDING) return 1;

        // otherwise sort by date
        return (secondTx.date?.getTime() || 0) - (firstTx.date?.getTime() || 0);
      }),
      'formattedDate'
    );

    const walletActivities = Object.entries(allTransactionsGrouped).map(([listName, transactionsList]) => ({
      title: listName,
      items: transactionsList
    }));

    return {
      walletActivities,
      activitiesCount: allTransactions.length
    };
  },
  (
    { addresses, transactions, assetInfo, delegation: { rewardsHistory } },
    { cardanoFiatPrice, fiatCurrency },
    { cardanoCoin, assetDetails, isSharedWallet }
  ) =>
    `${transactions.history.map(({ id }) => id).join('')}_${transactions.outgoing.inFlight
      .map(({ id }) => id)
      .join('')}_${transactions.outgoing.signed?.map(({ tx: { id } }) => id).join('')}_${assetInfo.size}_${
      rewardsHistory.all.length
    }_${cardanoFiatPrice}_${fiatCurrency.code}_${cardanoCoin?.id}_${assetDetails?.id}_${
      addresses[0]?.address
    }_${isSharedWallet}`
);

const getWalletActivities = async ({
  set,
  get,
  ...fetchActivitiesProps
}: FetchWalletActivitiesPropsWithSetter): Promise<void> => {
  set({ walletActivitiesStatus: StateStatus.LOADING });
  const {
    walletUI: { cardanoCoin },
    walletState,
    setTransactionActivityDetail,
    setRewardsActivityDetail,
    assetDetails,
    blockchainProvider: { assetProvider, inputResolver },
    isSharedWallet
  } = get();
  if (!walletState) {
    set(initialState);
    return;
  }

  const { walletActivities, activitiesCount } = await mapWalletActivities(walletState, fetchActivitiesProps, {
    assetProvider,
    cardanoCoin,
    setRewardsActivityDetail,
    setTransactionActivityDetail,
    assetDetails,
    inputResolver,
    isSharedWallet
  });

  set({
    walletActivities,
    activitiesCount,
    walletActivitiesStatus: StateStatus.LOADED
  });
};

/**
 * has all wallet activities related actions and states
 */
export const walletActivitiesSlice: SliceCreator<
  WalletInfoSlice & WalletActivitiesSlice & ActivityDetailSlice & AssetDetailsSlice & UISlice & BlockchainProviderSlice,
  WalletActivitiesSlice
> = ({ set, get }) => ({
  getWalletActivities: ({
    fiatCurrency,
    cardanoFiatPrice,
    sendAnalytics,
    withLimitedRewardsHistory
  }: FetchWalletActivitiesProps) =>
    getWalletActivities({
      fiatCurrency,
      cardanoFiatPrice,
      sendAnalytics,
      withLimitedRewardsHistory,
      set,
      get
    }),
  ...initialState
});
