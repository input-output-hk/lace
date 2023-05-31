import { useWalletStore } from '@src/stores';
import { getWalletFromStorage } from '@src/utils/get-wallet-from-storage';
import { useEffect } from 'react';

export const useWalletInfoSubscriber = (): void => {
  const { inMemoryWallet, setWalletInfo } = useWalletStore();

  useEffect(() => {
    inMemoryWallet?.addresses$.subscribe(([addresses]) => {
      setWalletInfo({
        name: getWalletFromStorage()?.name ?? 'Lace',
        address: addresses.address,
        rewardAccount: addresses.rewardAccount
      });
    });
  }, [inMemoryWallet?.addresses$, setWalletInfo]);
};
