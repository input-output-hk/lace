import flattenDeep from 'lodash/flattenDeep';
import uniq from 'lodash/uniq';
import { GetState, SetState } from 'zustand';
import BigNumber from 'bignumber.js';
import groupBy from 'lodash/groupBy';
import { mergeMap, combineLatest, tap, Observable, firstValueFrom, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Wallet } from '@lace/cardano';
import { EraSummary, Reward, TxCBOR, epochSlotsCalc } from '@cardano-sdk/core';
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
  TransactionActivityType
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
import { createHistoricalOwnInputResolver } from '@src/utils/own-input-resolver';

export interface FetchWalletActivitiesProps {
  fiatCurrency: CurrencyInfo;
  cardanoFiatPrice: number;
  assetId?: Wallet.Cardano.AssetId; // Allows to filter historicals tx by asset
  sendAnalytics?: () => void;
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
type MappedActivityListProps = Omit<AssetActivityListProps, 'items'> & {
  items: ExtendedActivityProps[];
};
export type FetchWalletActivitiesReturn = Observable<Promise<MappedActivityListProps[]>>;
export type DelegationTransactionType = Extract<
  TransactionActivityType,
  'delegation' | 'delegationRegistration' | 'delegationDeregistration'
>;

const delegationTransactionTypes: ReadonlySet<DelegationTransactionType> = new Set([
  'delegation',
  'delegationRegistration',
  'delegationDeregistration'
]);

type DelegationActivityItemProps = Omit<ExtendedActivityProps, 'type'> & {
  type: DelegationTransactionType;
};

const isDelegationActivity = (activity: ExtendedActivityProps): activity is DelegationActivityItemProps =>
  delegationTransactionTypes.has(activity.type as DelegationTransactionType);

const getDelegationAmount = (activity: DelegationActivityItemProps) => {
  const fee = new BigNumber(Number.parseFloat(activity.fee));

  if (activity.type === 'delegationRegistration') {
    return fee.plus(activity.deposit);
  }

  if (activity.type === 'delegationDeregistration') {
    return new BigNumber(activity.depositReclaim).minus(fee);
  }

  return fee;
};

const FIAT_PRICE_DECIMAL_PLACES = 2;

const getFiatAmount = (amount: BigNumber, fiatPrice: number) =>
  fiatPrice ? amount.times(new BigNumber(fiatPrice)).toFormat(FIAT_PRICE_DECIMAL_PLACES) : '';

const getWalletActivitiesObservable = async ({
  fiatCurrency,
  cardanoFiatPrice,
  sendAnalytics,
  set,
  get
}: FetchWalletActivitiesPropsWithSetter): Promise<FetchWalletActivitiesReturn> => {
  set({ walletActivitiesStatus: StateStatus.LOADING });
  const {
    walletInfo,
    walletUI: { cardanoCoin },
    inMemoryWallet,
    setTransactionActivityDetail,
    setRewardsActivityDetail,
    assetDetails,
    blockchainProvider: { assetProvider }
  } = get();
  const {
    addresses$,
    transactions,
    eraSummaries$,
    protocolParameters$,
    assetInfo$,
    delegation: { rewardsHistory$ }
  } = inMemoryWallet;
  const protocolParameters = await firstValueFrom(protocolParameters$);
  const walletAssets = await firstValueFrom(assetInfo$);
  const historicalTransactions$ = transactions.history$;
  const pendingTransactions$ = transactions.outgoing.inFlight$;
  const { resolveInput } = createHistoricalOwnInputResolver({
    addresses$,
    transactionsHistory$: transactions.history$
  });

  const { addresses } = walletInfo;

  const historicTransactionMapper = async (
    tx: Wallet.Cardano.HydratedTx,
    eraSummaries: EraSummary[]
  ): Promise<ExtendedActivityProps[]> => {
    const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
    const date = slotTimeCalc(tx.blockHeader.slot);
    const transformedTransaction = await txHistoryTransformer({
      tx,
      walletAddresses: addresses,
      fiatCurrency,
      fiatPrice: cardanoFiatPrice,
      date,
      protocolParameters,
      cardanoCoin,
      resolveInput
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
    tx: Wallet.TxInFlight,
    eraSummaries: EraSummary[]
  ): Promise<ExtendedActivityProps[]> => {
    let date;
    try {
      const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
      date = slotTimeCalc(tx.submittedAt);
    } catch {
      date = new Date();
    }
    const transformedTransaction = await pendingTxTransformer({
      tx,
      walletAddresses: addresses,
      fiatPrice: cardanoFiatPrice,
      fiatCurrency,
      protocolParameters,
      cardanoCoin,
      date,
      resolveInput
    });

    const extendWithClickHandler = (transformedTx: TransformedTransactionActivity) => ({
      ...transformedTx,
      onClick: () => {
        if (sendAnalytics) sendAnalytics();
        const deserializedTx: Wallet.Cardano.Tx = TxCBOR.deserialize(tx.cbor);
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

  const epochRewardsMapper = (
    earnedEpoch: Wallet.Cardano.EpochNo,
    rewards: Reward[],
    eraSummaries: EraSummary[]
  ): ExtendedActivityProps => {
    const REWARD_SPENDABLE_DELAY_EPOCHS = 2;
    const spendableEpoch = (earnedEpoch + REWARD_SPENDABLE_DELAY_EPOCHS) as Wallet.Cardano.EpochNo;
    const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
    const rewardSpendableDate = slotTimeCalc(epochSlotsCalc(spendableEpoch, eraSummaries).firstSlot);

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

  const filterTransactionByAssetId = (tx: Wallet.Cardano.HydratedTx[]) =>
    tx.filter((item) => {
      const type = inspectTxType({ walletAddresses: addresses, tx: item });
      const direction = getTxDirection({ type });
      const paymentAddresses: Wallet.Cardano.PaymentAddress[] = addresses.map((addr) => addr.address);
      return filterOutputsByTxDirection(item.body.outputs, direction, paymentAddresses).some((output) =>
        isTxWithAssets(Wallet.Cardano.AssetId(assetDetails.id), output?.value?.assets)
      );
    });

  /**
   * Sanitizes historical transactions data
   */
  const getHistoricalTransactions = (eraSummaries: EraSummary[]) =>
    historicalTransactions$.pipe(
      map((allTransactions: Wallet.Cardano.HydratedTx[]) =>
        // if asset is not cardano filter tx
        !assetDetails || assetDetails?.id === cardanoCoin.id
          ? allTransactions
          : filterTransactionByAssetId(allTransactions)
      ),
      mergeMap((allTransactions: Wallet.Cardano.HydratedTx[]) =>
        from(Promise.all(allTransactions.map((tx) => historicTransactionMapper(tx, eraSummaries))))
      ),
      map(flattenDeep)
    );

  /**
   * Sanitizes pending transactions data
   */
  const getPendingTransactions = (eraSummaries: EraSummary[]): Observable<ExtendedActivityProps[]> =>
    pendingTransactions$.pipe(
      mergeMap((pendingTransactions: Wallet.TxInFlight[]) =>
        from(Promise.all(pendingTransactions.map((tx) => pendingTransactionMapper(tx, eraSummaries))))
      ),
      map(flattenDeep)
    );

  /**
   * Sanitizes historical rewards data
   */
  const getRewardsHistory = (eraSummaries: EraSummary[]) =>
    rewardsHistory$.pipe(
      map((allRewards: Wallet.RewardsHistory) =>
        Object.entries(groupBy(allRewards.all, ({ epoch }) => epoch.toString()))
          .map(([epoch, rewards]) => epochRewardsMapper(Number(epoch) as Wallet.Cardano.EpochNo, rewards, eraSummaries))
          .filter((reward) => reward.date.getTime() < Date.now())
      )
    );

  /**
   * 1. Listens for time settings
   * 2. Passes it to historical transactions, pending transactions and rewards history lists
   * 3. Emits the lists combined and sets current state for Zustand
   */
  return combineLatest([eraSummaries$, pendingTransactions$, historicalTransactions$, rewardsHistory$]).pipe(
    mergeMap(([eraSummaries]) =>
      combineLatest([
        getHistoricalTransactions(eraSummaries),
        getPendingTransactions(eraSummaries),
        getRewardsHistory(eraSummaries)
      ])
    ),
    map(async ([historicalTransactions, pendingTransactions, rewards]) => {
      const confirmedTxs = await historicalTransactions;
      const pendingTxs = await pendingTransactions;
      /* After the transaction is confirmed is not being removed from pendingTransactions$, so we have to remove it manually from pending list
      this is a workaround, as it seems to be an issue on the sdk side
      */
      const filteredPendingTxs = pendingTxs.filter((pending) =>
        confirmedTxs.some((confirmed) => confirmed?.id !== pending?.id)
      );
      return [...filteredPendingTxs, ...confirmedTxs, ...rewards];
    }),
    map(async (allTransactions) =>
      (await allTransactions).sort((firstTx, secondTx) => {
        // ensure pending txs are always first
        if (firstTx.status === ActivityStatus.PENDING && secondTx.status !== ActivityStatus.PENDING) return -1;
        if (secondTx.status === ActivityStatus.PENDING && firstTx.status !== ActivityStatus.PENDING) return 1;
        // otherwise sort by date
        return secondTx.date.getTime() - firstTx.date.getTime();
      })
    ),
    map(async (allTransactions) => groupBy(await allTransactions, 'formattedDate')),
    map(
      async (lists): Promise<MappedActivityListProps[]> =>
        Object.entries(await lists).map(([listName, transactionsList]) => ({
          title: listName,
          items: transactionsList
        }))
    ),
    tap(async (allActivities) => {
      const activities = await allActivities;
      const flattenedActivities = flattenDeep(activities.map(({ items }: AssetActivityListProps) => items));
      const allAssetsIds = uniq(
        flattenDeep(
          flattenedActivities.map(({ assets }: AssetActivityItemProps) =>
            assets.map(({ id }: ActivityAssetProp) => Wallet.Cardano.AssetId(id))
          )
        )
      );
      const assetsInfo = await getAssetsInformation(allAssetsIds, walletAssets, {
        assetProvider,
        extraData: {
          nftMetadata: true,
          tokenMetadata: true
        }
      });

      const walletActivities = activities.map((activityList) => ({
        ...activityList,
        items: activityList.items.map((activity) => ({
          ...activity,
          ...(isDelegationActivity(activity) && {
            amount: `${getDelegationAmount(activity)} ${cardanoCoin.symbol}`,
            fiatAmount: `${getFiatAmount(getDelegationAmount(activity), cardanoFiatPrice)} ${fiatCurrency.code}`
          }),
          ...(activity.type === 'self' && {
            amount: `${activity.fee} ${cardanoCoin.symbol}`,
            fiatAmount: cardanoFiatPrice
              ? `${getFiatAmount(new BigNumber(activity.fee), cardanoFiatPrice)} ${fiatCurrency.code}`
              : '-'
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
        }))
      }));

      set({
        walletActivities,
        activitiesCount: (await allActivities).reduce(
          (accumulator, currentList) => accumulator + currentList.items.length,
          0
        ),
        walletActivitiesStatus: StateStatus.LOADED
      });
    })
  );
};

/**
 * has all wallet activities related actions and states
 */
export const walletActivitiesSlice: SliceCreator<
  WalletInfoSlice & WalletActivitiesSlice & ActivityDetailSlice & AssetDetailsSlice & UISlice & BlockchainProviderSlice,
  WalletActivitiesSlice
> = ({ set, get }) => ({
  getWalletActivitiesObservable: ({
    fiatCurrency,
    cardanoFiatPrice,
    assetId,
    sendAnalytics
  }: FetchWalletActivitiesProps) =>
    getWalletActivitiesObservable({ fiatCurrency, cardanoFiatPrice, assetId, sendAnalytics, set, get }),
  walletActivities: [],
  activitiesCount: 0,
  walletActivitiesStatus: StateStatus.IDLE
});
