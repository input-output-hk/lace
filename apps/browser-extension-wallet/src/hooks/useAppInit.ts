/* eslint-disable unicorn/no-null */
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import { useWalletManager } from '@hooks';
import { useWalletStore } from '@stores';
import { getValueFromLocalStorage } from '@utils/local-storage';
import { useEffect } from 'react';
import { runtime } from 'webextension-polyfill';

export const useAppInit = (): void => {
  const { setAddressesDiscoveryCompleted, setWalletManagerUi, walletManagerUi, setWalletInfo } = useWalletStore();
  const { updateKeyAgent } = useWalletManager();

  useEffect(() => {
    const walletManager = new WalletManagerUi({ walletName: process.env.WALLET_NAME }, { logger: console, runtime });
    setWalletManagerUi(walletManager);
  }, [setWalletManagerUi]);

  useEffect(() => {
    if (!walletManagerUi?.wallet) return () => void 0;

    const subscription = walletManagerUi.wallet.addresses$.subscribe(async (knownAddresses) => {
      const currentKeyAgentData = getValueFromLocalStorage('keyAgentData');
      if (!currentKeyAgentData) return;

      await updateKeyAgent({
        ...currentKeyAgentData,
        knownAddresses
      });

      const { name } = getValueFromLocalStorage('wallet');
      setWalletInfo({
        name,
        addresses: knownAddresses
      });

      setAddressesDiscoveryCompleted(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setAddressesDiscoveryCompleted, setWalletInfo, updateKeyAgent, walletManagerUi?.wallet]);
};
