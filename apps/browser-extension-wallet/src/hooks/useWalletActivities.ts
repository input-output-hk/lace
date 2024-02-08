import { useCurrencyStore } from '@providers';
import { useCallback, useEffect } from 'react';
import { useFetchCoinPrice } from './useFetchCoinPrice';
import { WalletActivitiesSlice, useWalletStore } from '@src/stores';
import noop from 'lodash/noop';

type UseWalletActivitiesProps = {
  sendAnalytics: () => void;
};
const noAnalyticsProps = { sendAnalytics: noop };
type WalletActivities = Omit<WalletActivitiesSlice, 'getWalletActivities'>;

export const useWalletActivities = ({
  sendAnalytics
}: UseWalletActivitiesProps = noAnalyticsProps): WalletActivities => {
  const { fiatCurrency } = useCurrencyStore();
  const { priceResult } = useFetchCoinPrice();
  const { getWalletActivities, walletActivitiesStatus, walletActivities, activitiesCount, walletState } =
    useWalletStore();

  const cardanoFiatPrice = priceResult?.cardano?.price;

  const fetchWalletActivities = useCallback(async () => {
    fiatCurrency &&
      getWalletActivities({
        fiatCurrency,
        cardanoFiatPrice,
        sendAnalytics
      });
  }, [fiatCurrency, cardanoFiatPrice, getWalletActivities, sendAnalytics]);

  useEffect(() => {
    fetchWalletActivities();
  }, [
    fetchWalletActivities,
    walletState?.transactions.history,
    walletState?.transactions.outgoing.inFlight,
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
