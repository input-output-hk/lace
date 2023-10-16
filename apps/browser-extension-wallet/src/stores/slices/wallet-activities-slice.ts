import flattenDeep from 'lodash/flattenDeep';
import uniq from 'lodash/uniq';
import { GetState, SetState } from 'zustand';
import BigNumber from 'bignumber.js';
import groupBy from 'lodash/groupBy';
import { mergeMap, combineLatest, tap, Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { Wallet } from '@lace/cardano';
import { EraSummary, Reward, TxCBOR, epochSlotsCalc } from '@cardano-sdk/core';
import {
  pendingTxTransformer,
  txHistoryTransformer,
  filterOutputsByTxDirection,
  isTxWithAssets,
  TransformedTx
} from '@src/views/browser-view/features/activity/helpers';
import {
  AssetActivityItemProps,
  AssetActivityListProps,
  ActivityAssetProp,
  TransactionType,
  TransactionStatus
} from '@lace/core';
import { CurrencyInfo, TxDirections } from '@src/types';
import { getTxDirection, inspectTxType } from '@src/utils/tx-inspection';
import { assetTransformer } from '@src/utils/assets-transformers';
import {
  WalletActivitiesSlice,
  StateStatus,
  WalletInfoSlice,
  AssetDetailsSlice,
  TransactionDetailSlice,
  UISlice,
  BlockchainProviderSlice,
  SliceCreator
} from '../types';
import { getAssetsInformation } from '@src/utils/get-assets-information';
import { rewardHistoryTransformer } from '@src/views/browser-view/features/activity/helpers/reward-history-transformer';
import { EpochNo } from '@cardano-sdk/core/dist/cjs/Cardano';

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
      TransactionDetailSlice &
      AssetDetailsSlice &
      UISlice &
      BlockchainProviderSlice
  >;
  set: SetState<WalletActivitiesSlice>;
}

export type FetchWalletActivitiesReturn = Observable<Promise<AssetActivityListProps[]>>;
export type DelegationTransactionType = Extract<
  TransactionType,
  'delegation' | 'delegationRegistration' | 'delegationDeregistration'
>;

const delegationTransactionTypes: ReadonlySet<DelegationTransactionType> = new Set([
  'delegation',
  'delegationRegistration',
  'delegationDeregistration'
]);

type DelegationActivityItemProps = Omit<AssetActivityItemProps, 'type'> & {
  type: DelegationTransactionType;
};

const isDelegationActivity = (activity: AssetActivityItemProps): activity is DelegationActivityItemProps =>
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
    setTransactionDetail,
    assetDetails,
    blockchainProvider: { assetProvider }
  } = get();
  const {
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

  const { addresses } = walletInfo;

  const historicTransactionMapper = (
    tx: Wallet.Cardano.HydratedTx,
    eraSummaries: EraSummary[]
  ): Array<AssetActivityItemProps> => {
    const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
    const date = slotTimeCalc(tx.blockHeader.slot);
    const transformedTransaction = txHistoryTransformer({
      tx,
      walletAddresses: addresses,
      fiatCurrency,
      fiatPrice: cardanoFiatPrice,
      date,
      protocolParameters,
      cardanoCoin
    });

    const extendWithClickHandler = (transformedTx: TransformedTx) => ({
      ...transformedTx,
      onClick: () => {
        if (sendAnalytics) sendAnalytics();
        setTransactionDetail({
          tx,
          direction: transformedTx.direction,
          status: transformedTx.status,
          type: transformedTx.type
        });
      }
    });

    return transformedTransaction.map((tt) => extendWithClickHandler(tt));
  };

  const pendingTransactionMapper = (
    tx: Wallet.TxInFlight,
    eraSummaries: EraSummary[]
  ): Array<AssetActivityItemProps> => {
    let date;
    try {
      const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
      date = slotTimeCalc(tx.submittedAt);
    } catch {
      date = new Date();
    }
    const transformedTransaction = pendingTxTransformer({
      tx,
      walletAddresses: addresses,
      fiatPrice: cardanoFiatPrice,
      fiatCurrency,
      protocolParameters,
      cardanoCoin,
      date
    });

    const extendWithClickHandler = (transformedTx: TransformedTx) => ({
      ...transformedTx,
      onClick: () => {
        if (sendAnalytics) sendAnalytics();
        const deserializedTx: Wallet.Cardano.Tx = TxCBOR.deserialize(tx.cbor);
        setTransactionDetail({
          tx: deserializedTx,
          direction: TxDirections.Outgoing,
          status: Wallet.TransactionStatus.PENDING,
          type: transformedTx.type
        });
      }
    });

    return transformedTransaction.map((tt) => extendWithClickHandler(tt));
  };

  const epochRewardsMapper = (
    earnedEpoch: EpochNo,
    rewards: Reward[],
    eraSummaries: EraSummary[]
  ): AssetActivityItemProps => {
    const REWARD_SPENDABLE_DELAY_EPOCHS = 2;
    const spendableEpoch = (earnedEpoch + REWARD_SPENDABLE_DELAY_EPOCHS) as EpochNo;
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
        setTransactionDetail({
          direction: transformedEpochRewards.direction,
          status: transformedEpochRewards.status,
          type: transformedEpochRewards.type,
          epochRewards: {
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
      map((allTransactions: Wallet.Cardano.HydratedTx[]) =>
        flattenDeep(allTransactions.map((tx) => historicTransactionMapper(tx, eraSummaries)))
      )
    );

  /**
   * Sanitizes pending transactions data
   */
  const getPendingTransactions = (eraSummaries: EraSummary[]) =>
    pendingTransactions$.pipe(
      map((pendingTransactions: Wallet.TxInFlight[]) =>
        flattenDeep(pendingTransactions.map((tx) => pendingTransactionMapper(tx, eraSummaries)))
      )
    );

  /**
   * Sanitizes historical rewards data
   */
  const getRewardsHistory = (eraSummaries: EraSummary[]) =>
    rewardsHistory$.pipe(
      map((allRewards: Wallet.RewardsHistory) =>
        Object.entries(groupBy(allRewards.all, ({ epoch }) => epoch.toString()))
          .map(([epoch, rewards]) => epochRewardsMapper(Number(epoch) as EpochNo, rewards, eraSummaries))
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
    map(async (allTransactions: Promise<AssetActivityItemProps[]>) =>
      (await allTransactions).sort((firstTx, secondTx) => {
        // ensure pending txs are always first
        if (firstTx.status === TransactionStatus.PENDING && secondTx.status !== TransactionStatus.PENDING) return 1;
        if (secondTx.status === TransactionStatus.PENDING && firstTx.status !== TransactionStatus.PENDING) return -1;
        // otherwise sort by date
        return secondTx.date.getTime() - firstTx.date.getTime();
      })
    ),
    map(async (allTransactions: Promise<AssetActivityItemProps[]>) => groupBy(await allTransactions, 'formattedDate')),
    map(async (lists) =>
      Object.entries(await lists).map(([listName, transactionsList]) => ({
        title: listName,
        items: transactionsList
      }))
    ),
    tap(async (allActivities: Promise<AssetActivityListProps[]>) => {
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

      const walletActivities = activities.map((activityList: AssetActivityListProps) => ({
        ...activityList,
        items: activityList.items.map((activity: AssetActivityItemProps) => ({
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
  WalletInfoSlice &
    WalletActivitiesSlice &
    TransactionDetailSlice &
    AssetDetailsSlice &
    UISlice &
    BlockchainProviderSlice,
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
