import flattenDeep from 'lodash/flattenDeep';
import uniq from 'lodash/uniq';
import { GetState, SetState } from 'zustand';
import BigNumber from 'bignumber.js';
import groupBy from 'lodash/groupBy';
import { mergeMap, combineLatest, tap, Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { Wallet } from '@lace/cardano';
import { EraSummary, TxCBOR } from '@cardano-sdk/core';
import {
  pendingTxTransformer,
  txHistoryTransformer,
  filterOutputsByTxDirection,
  isTxWithAssets
} from '@src/views/browser-view/features/activity/helpers';
import { AssetActivityItemProps, AssetActivityListProps, ActivityAssetProp } from '@lace/core';
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
const DelegationTransactionTypes = ['delegation', 'delegationRegistration', 'delegationDeregistration'] as const;

type DelegationActivityItemProps = Omit<AssetActivityItemProps, 'type'> & {
  type?: typeof DelegationTransactionTypes[number];
};

const isDelegationActivity = (activity: AssetActivityItemProps): activity is DelegationActivityItemProps =>
  // [].includes and Set(...).has do not work for narrowed Arrays https://stackoverflow.com/questions/55906553/typescript-unexpected-error-when-using-includes-with-a-typed-array
  // eslint-disable-next-line unicorn/prefer-includes
  DelegationTransactionTypes.some((type) => type === activity.type);

const getDelegationAmount = (activity: DelegationActivityItemProps) => {
  const fee = new BigNumber(Number.parseFloat(activity.fee));

  // stake key registrations
  if (activity.deposit) {
    return fee.plus(activity.deposit);
  }

  // stake key de-registrations
  if (activity.depositReclaim) {
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
  const { transactions, eraSummaries$, protocolParameters$, assetInfo$ } = inMemoryWallet;
  const protocolParameters = await firstValueFrom(protocolParameters$);
  const walletAssets = await firstValueFrom(assetInfo$);
  const historicalTransactions$ = transactions.history$;
  const pendingTransactions$ = transactions.outgoing.inFlight$;

  const { addresses } = walletInfo;

  const historicTransactionMapper = (
    tx: Wallet.Cardano.HydratedTx,
    eraSummaries: EraSummary[]
  ): AssetActivityItemProps | Array<AssetActivityItemProps> => {
    const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
    const time = slotTimeCalc(tx.blockHeader.slot);
    const transformedTransaction = txHistoryTransformer({
      tx,
      walletAddresses: addresses,
      fiatCurrency,
      fiatPrice: cardanoFiatPrice,
      time,
      protocolParameters,
      cardanoCoin
    });

    const finalizeTransaction = (transformedTx: Omit<AssetActivityItemProps, 'onClick'>) => ({
      ...transformedTx,
      onClick: () => {
        if (sendAnalytics) sendAnalytics();
        setTransactionDetail(tx, transformedTx.direction, transformedTx.status, transformedTx.type);
      }
    });

    /*
    considering the current SDK logic for automatically withdraw rewards when building a transaction and such behavior has to be transparent for the user,
    we will remove the withdrawal from the transaction history as it is implemented today.
    Instead, we will show rewards in the transaction history whenever the user receives them.
    To make this happen we need to create a new record Rewards and added to the transaction history
    */
    if (Array.isArray(transformedTransaction)) {
      return transformedTransaction.map((tt) => finalizeTransaction(tt));
    }

    return finalizeTransaction(transformedTransaction);
  };

  const pendingTransactionMapper = (
    tx: Wallet.TxInFlight,
    eraSummaries: EraSummary[]
  ): AssetActivityItemProps | Array<AssetActivityItemProps> => {
    let time;
    try {
      const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
      time = slotTimeCalc(tx.submittedAt);
    } catch {
      time = new Date();
    }
    const transformedTransaction = pendingTxTransformer({
      tx,
      walletAddresses: addresses,
      fiatPrice: cardanoFiatPrice,
      fiatCurrency,
      protocolParameters,
      cardanoCoin,
      time
    });

    const finalizeTransaction = (transformedTx: Omit<AssetActivityItemProps, 'onClick'>) => ({
      ...transformedTx,
      onClick: () => {
        if (sendAnalytics) sendAnalytics();
        const deserializedTx: Wallet.Cardano.Tx = TxCBOR.deserialize(tx.cbor);
        setTransactionDetail(
          deserializedTx,
          TxDirections.Outgoing,
          Wallet.TransactionStatus.PENDING,
          transformedTx.type
        );
      }
    });

    if (Array.isArray(transformedTransaction)) {
      return transformedTransaction.map((tt) => finalizeTransaction(tt));
    }

    return finalizeTransaction(transformedTransaction);
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
   * Sorts and sanitizes historical transactions data
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
        allTransactions.sort(
          (firstTransaction, secondTransaction) =>
            secondTransaction.blockHeader.slot.valueOf() - firstTransaction.blockHeader.slot.valueOf()
        )
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
   * 1. Listens for time settings
   * 2. Passes it to hisorical transactions and pending transactions lists
   * 3. Emits both lists combined and sets current state for Zustand
   */
  return combineLatest([eraSummaries$, pendingTransactions$, historicalTransactions$]).pipe(
    mergeMap(([eraSummaries]) =>
      combineLatest([getHistoricalTransactions(eraSummaries), getPendingTransactions(eraSummaries)])
    ),
    map(async ([historicalTransactions, pendingTransactions]) => {
      const confirmedTxs = await historicalTransactions;
      const pendingTxs = await pendingTransactions;
      /* After the transaction is confirmed is not being removed from pendingTransactions$, so we have to remove it manually from pending list
      this is a workaround, as it seems to be an issue on the sdk side
      */
      const filteredPendingTxs = pendingTxs.filter((pending) =>
        confirmedTxs.some((confirmed) => confirmed?.id !== pending?.id)
      );
      return [...filteredPendingTxs, ...confirmedTxs];
    }),
    map(async (allTransactions: Promise<AssetActivityItemProps[]>) => groupBy(await allTransactions, 'date')),
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
