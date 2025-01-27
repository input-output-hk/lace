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

export type UseWalletActivitiesPaginatedProps = UseWalletActivitiesProps;
export type WalletActivitiesPaginated = Pick<WalletActivities, 'walletActivities'> & {
  loadMore: () => void;
  mightHaveMore: boolean;
  loadedTxLength?: number;
};

export const useWalletActivitiesPaginated = ({
  sendAnalytics
}: UseWalletActivitiesPaginatedProps = noAnalyticsProps): WalletActivitiesPaginated => {
  const [walletActivities, setWalletActivities] = useState<AssetActivityListProps[] | undefined>();
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

  const { loadMore, loadedHistory$ } = useTxHistoryLoader(pageSize);

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

  useEffect(() => {
    (async () => {
      if (loadedHistory?.transactions === undefined || !fiatCurrency || !cardanoFiatPrice) return;
      const { transactions } = walletState;

      const activities = await mapWalletActivities(
        {
          ...walletState,
          transactions: { ...transactions, history: loadedHistory.transactions }
        },
        fetchActivitiesProps,
        fetchActivitiesDeps
      );

      setWalletActivities(activities.walletActivities);
    })();
  }, [
    cardanoFiatPrice,
    fetchActivitiesDeps,
    fetchActivitiesProps,
    fiatCurrency,
    loadedHistory.transactions,
    walletState
  ]);

  return {
    walletActivities,
    mightHaveMore: loadedHistory?.mightHaveMore,
    loadedTxLength: loadedHistory?.transactions?.length,
    loadMore
  };
};
