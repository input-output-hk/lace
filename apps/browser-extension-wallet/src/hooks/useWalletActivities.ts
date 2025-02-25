import { useCurrencyStore } from '@providers';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFetchCoinPrice } from './useFetchCoinPrice';
import { WalletActivitiesSlice, useWalletStore } from '@src/stores';
import noop from 'lodash/noop';
import { mapWalletActivities } from '@src/stores/slices';
import { Wallet } from '@lace/cardano';
import { AssetActivityListProps, useItemsPageSize } from '@lace/core';
import { useTxHistoryLoader } from './useTxHistoryLoader';
import { useAsyncSwitchMap } from '@hooks/useAsyncSwitchMap';

type UseWalletActivitiesProps = {
  sendAnalytics: () => void;
  withLimitedRewardsHistory?: boolean;
};
const noAnalyticsProps = { sendAnalytics: noop };
type WalletActivities = Omit<WalletActivitiesSlice, 'getWalletActivities'>;

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

  const pageSize = useItemsPageSize();

  const { loadMore: txHistoryLoaderLoadMore, loadedHistory } = useTxHistoryLoader(pageSize);

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

      return (
        await mapWalletActivities(
          {
            ...walletState,
            transactions: { ...transactions, history }
          },
          fetchActivitiesProps,
          fetchActivitiesDeps
        )
      ).walletActivities;
    },
    [fetchActivitiesDeps, fetchActivitiesProps, walletState]
  );

  const handleUpdateWalletActivities = useAsyncSwitchMap(mapActivities, setWalletActivities);

  useEffect(() => {
    (async () => {
      if (loadedHistory?.transactions === undefined || !fiatCurrency || !cardanoFiatPrice) return;

      handleUpdateWalletActivities(loadedHistory.transactions.slice(0, currentPage * pageSize));
    })();
  }, [
    cardanoFiatPrice,
    currentPage,
    fetchActivitiesDeps,
    fetchActivitiesProps,
    fiatCurrency,
    handleUpdateWalletActivities,
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
