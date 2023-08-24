import { useCurrencyStore } from '@providers';
import { FetchWalletActivitiesReturn } from '@src/stores/slices';
import { useCallback, useEffect, useState } from 'react';
import { useFetchCoinPrice } from './useFetchCoinPrice';
import { WalletActivitiesSlice, useWalletStore } from '@src/stores';

type UseWalletActivitiesProps = {
  sendAnalytics: () => void;
};
type WalletActivities = Omit<WalletActivitiesSlice, 'getWalletActivitiesObservable'>;

export const useWalletActivities = ({ sendAnalytics }: UseWalletActivitiesProps): WalletActivities => {
  const [walletActivitiesObservable, setWalletActivitiesObservable] = useState<FetchWalletActivitiesReturn>();
  const { fiatCurrency } = useCurrencyStore();
  const { priceResult } = useFetchCoinPrice();
  const { getWalletActivitiesObservable, walletActivitiesStatus, walletActivities, activitiesCount } = useWalletStore();

  const cardanoFiatPrice = priceResult?.cardano?.price;

  const fetchWalletActivities = useCallback(async () => {
    const result =
      fiatCurrency &&
      (await getWalletActivitiesObservable({
        fiatCurrency,
        cardanoFiatPrice,
        sendAnalytics
      }));
    setWalletActivitiesObservable(result);
  }, [fiatCurrency, cardanoFiatPrice, getWalletActivitiesObservable, sendAnalytics]);

  useEffect(() => {
    fetchWalletActivities();
  }, [fetchWalletActivities]);

  useEffect(() => {
    const subscription = walletActivitiesObservable?.subscribe();
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [walletActivitiesObservable]);

  return {
    walletActivitiesStatus,
    walletActivities,
    activitiesCount
  };
};
