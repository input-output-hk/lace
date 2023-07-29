/* eslint-disable unicorn/no-null */
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import { useWalletManager } from '@hooks';
import { useWalletStore } from '@stores';
import { getValueFromLocalStorage } from '@utils/local-storage';
import { useEffect } from 'react';
import { runtime } from 'webextension-polyfill';

export const useAppInit = (): void => {
  const { setAddressesDiscoveryCompleted, setWalletManagerUi, walletManagerUi } = useWalletStore();
  const { updateKeyAgentData } = useWalletManager();

  useEffect(() => {
    const walletManager = new WalletManagerUi({ walletName: process.env.WALLET_NAME }, { logger: console, runtime });
    setWalletManagerUi(walletManager);
  }, [setWalletManagerUi]);

  useEffect(() => {
    if (!walletManagerUi?.wallet) return () => void 0;

    const subscription = walletManagerUi.wallet.addresses$.subscribe(async (knownAddresses) => {
      const currentKeyAgentData = getValueFromLocalStorage('keyAgentData');
      if (!currentKeyAgentData) return;

      await updateKeyAgentData({
        ...currentKeyAgentData,
        knownAddresses
      });
      setAddressesDiscoveryCompleted(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setAddressesDiscoveryCompleted, updateKeyAgentData, walletManagerUi?.wallet]);
};
