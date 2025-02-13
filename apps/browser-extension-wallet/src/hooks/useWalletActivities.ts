import { useCurrencyStore } from '@providers';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFetchCoinPrice } from './useFetchCoinPrice';
import { WalletActivitiesSlice, useWalletStore } from '@src/stores';
import noop from 'lodash/noop';
import { mapWalletActivities } from '@src/stores/slices';
import { Wallet } from '@lace/cardano';
import { AssetActivityListProps, useGroupedActivitiesPageSize } from '@lace/core';
import { useObservable } from '@lace/common';
import { useTxHistoryLoader } from './useTxHistoryLoader';

type UseWalletActivitiesProps = {
  sendAnalytics: () => void;
  withLimitedRewardsHistory?: boolean;
};
const noAnalyticsProps = { sendAnalytics: noop };
type WalletActivities = Omit<WalletActivitiesSlice, 'getWalletActivities'>;

const TX_HISTORY_LOADING = {
  transactions: undefined as Wallet.Cardano.HydratedTx[],
  mightHaveMore: false
};

export const useWalletActivities = ({
  sendAnalytics,
  withLimitedRewardsHistory
}: UseWalletActivitiesProps = noAnalyticsProps): WalletActivities => {
  const { fiatCurrency } = useCurrencyStore();
  const { priceResult } = useFetchCoinPrice();
  const { getWalletActivities, walletActivitiesStatus, walletActivities, activitiesCount, walletState } =
    useWalletStore();

  const cardanoFiatPrice = priceResult?.cardano?.price;

  const fetchWalletActivities = useCallback(async () => {
    fiatCurrency &&
      cardanoFiatPrice &&
      getWalletActivities({
        fiatCurrency,
        cardanoFiatPrice,
        sendAnalytics,
        withLimitedRewardsHistory
      });
  }, [fiatCurrency, cardanoFiatPrice, getWalletActivities, withLimitedRewardsHistory, sendAnalytics]);

  useEffect(() => {
    fetchWalletActivities();
  }, [
    fetchWalletActivities,
    walletState?.transactions.history,
    walletState?.transactions.outgoing.inFlight,
    walletState?.transactions.outgoing.signed,
    walletState?.addresses,
    walletState?.assetInfo,
    walletState?.delegation.rewardsHistory,
    walletState?.eraSummaries
  ]);

  return {
    walletActivitiesStatus,
    walletActivities,
    activitiesCount
  };
};

export type WalletActivitiesPaginated = Pick<WalletActivities, 'walletActivities'> & {
  loadMore: () => void;
  mightHaveMore: boolean;
  loadedTxLength?: number;
};

export const useWalletActivitiesPaginated = ({
  sendAnalytics
}: UseWalletActivitiesProps = noAnalyticsProps): WalletActivitiesPaginated => {
  const [walletActivities, setWalletActivities] = useState<AssetActivityListProps[] | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const { fiatCurrency } = useCurrencyStore();
  const { priceResult } = useFetchCoinPrice();
  const {
    walletUI: { cardanoCoin },
    walletState,
    setTransactionActivityDetail,
    setRewardsActivityDetail,
    assetDetails,
    blockchainProvider: { assetProvider, inputResolver },
    isSharedWallet
  } = useWalletStore();

  const cardanoFiatPrice = priceResult?.cardano?.price;

  const pageSize = useGroupedActivitiesPageSize();

  const { loadMore: txHistoryLoaderLoadMore, loadedHistory$ } = useTxHistoryLoader(pageSize);

  const loadedHistory = useObservable(loadedHistory$, TX_HISTORY_LOADING);

  const fetchActivitiesProps = useMemo(
    () => ({
      fiatCurrency,
      cardanoFiatPrice,
      sendAnalytics,
      withLimitedRewardsHistory: true
    }),
    [cardanoFiatPrice, fiatCurrency, sendAnalytics]
  );

  const fetchActivitiesDeps = useMemo(
    () => ({
      assetProvider,
      cardanoCoin,
      setRewardsActivityDetail,
      setTransactionActivityDetail,
      assetDetails,
      inputResolver,
      isSharedWallet
    }),
    [
      assetProvider,
      cardanoCoin,
      setRewardsActivityDetail,
      setTransactionActivityDetail,
      assetDetails,
      inputResolver,
      isSharedWallet
    ]
  );

  const mapActivities = useCallback(
    async (history: Wallet.Cardano.HydratedTx[]) => {
      const { transactions } = walletState;

      return await mapWalletActivities(
        {
          ...walletState,
          transactions: { ...transactions, history }
        },
        fetchActivitiesProps,
        fetchActivitiesDeps
      );
    },
    [fetchActivitiesDeps, fetchActivitiesProps, walletState]
  );

  useEffect(() => {
    (async () => {
      if (loadedHistory?.transactions === undefined || !fiatCurrency || !cardanoFiatPrice) return;

      const activities = await mapActivities(loadedHistory.transactions.slice(0, currentPage * pageSize));

      setWalletActivities(activities.walletActivities);
    })();
  }, [
    cardanoFiatPrice,
    currentPage,
    fetchActivitiesDeps,
    fetchActivitiesProps,
    fiatCurrency,
    loadedHistory?.transactions,
    mapActivities,
    pageSize,
    walletState
  ]);

  const loadMore = useCallback(() => {
    if (currentPage * pageSize >= (loadedHistory?.transactions?.length ?? 0)) {
      txHistoryLoaderLoadMore();
    }
    setCurrentPage((prevPage) => prevPage + 1);
  }, [currentPage, loadedHistory?.transactions?.length, pageSize, txHistoryLoaderLoadMore]);

  return {
    walletActivities,
    mightHaveMore: loadedHistory?.mightHaveMore,
    loadedTxLength: loadedHistory?.transactions?.slice(0, currentPage * pageSize).length,
    loadMore
  };
};
