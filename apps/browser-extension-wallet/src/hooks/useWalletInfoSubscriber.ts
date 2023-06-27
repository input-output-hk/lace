import { useWalletStore } from '@src/stores';
import { getWalletFromStorage } from '@src/utils/get-wallet-from-storage';
import { useEffect } from 'react';

export const useWalletInfoSubscriber = (): void => {
  const { inMemoryWallet, setWalletInfo } = useWalletStore();

  useEffect(() => {
    const subscription = inMemoryWallet?.addresses$.subscribe((addresses) => {
      setWalletInfo({
        name: getWalletFromStorage()?.name ?? 'Lace',
        addresses
      });
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [inMemoryWallet?.addresses$, setWalletInfo]);
};
