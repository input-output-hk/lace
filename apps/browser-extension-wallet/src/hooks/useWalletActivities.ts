import { useCurrencyStore } from '@providers';
import { FetchWalletActivitiesReturn } from '@src/stores/slices';
import { useCallback, useEffect, useState } from 'react';
import { useFetchCoinPrice } from './useFetchCoinPrice';
import { StateStatus, useWalletStore } from '@src/stores';
import { AssetActivityListProps } from '@lace/core';

type UseWalletActivitiesProps = {
  sendAnalytics: () => void;
};

export const useWalletActivities = ({
  sendAnalytics
}: UseWalletActivitiesProps): {
  walletActivitiesStatus: StateStatus;
  walletActivities: AssetActivityListProps[];
  activitiesCount: number;
} => {
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
