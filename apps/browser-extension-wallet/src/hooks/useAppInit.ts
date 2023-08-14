/* eslint-disable unicorn/no-null */
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import { useWalletManager } from '@hooks';
import { useWalletStore } from '@stores';
import { getValueFromLocalStorage } from '@utils/local-storage';
import { useEffect } from 'react';
import { runtime } from 'webextension-polyfill';

export const useAppInit = (): void => {
  const { environmentName, setAddressesDiscoveryCompleted, setWalletInfo, setWalletManagerUi, walletManagerUi } =
    useWalletStore();
  const { updateAddresses } = useWalletManager();

  useEffect(() => {
    const walletManager = new WalletManagerUi({ walletName: process.env.WALLET_NAME }, { logger: console, runtime });
    setWalletManagerUi(walletManager);
  }, [setWalletManagerUi]);

  useEffect(() => {
    if (!walletManagerUi?.wallet) return () => void 0;

    const subscription = walletManagerUi?.wallet.addresses$.subscribe(async (addresses) => {
      if (addresses.length === 0) return;

      await updateAddresses({
        addresses,
        currentChainName: environmentName
      });

      const { name } = getValueFromLocalStorage('wallet');
      setWalletInfo({
        name: name ?? 'Lace',
        addresses
      });

      setAddressesDiscoveryCompleted(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [walletManagerUi?.wallet, environmentName, setAddressesDiscoveryCompleted, setWalletInfo, updateAddresses]);
};
