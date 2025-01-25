import { useCurrencyStore } from '@providers';
import { useCallback, useEffect } from 'react';
import { useFetchCoinPrice } from './useFetchCoinPrice';
import { WalletActivitiesSlice, useWalletStore } from '@src/stores';
import noop from 'lodash/noop';

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
