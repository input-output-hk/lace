/* eslint-disable unicorn/no-null */
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import { useWalletStore } from '@stores';
import { getValueFromLocalStorage, saveValueInLocalStorage } from '@utils/local-storage';
import { useEffect, useRef } from 'react';
import { Subscription } from 'rxjs';
import { runtime } from 'webextension-polyfill';

export const useAppInit = (): void => {
  const subscription = useRef<Subscription | null>(null);
  const { setAddressesDiscoveryCompleted, setWalletManagerUi, walletManagerUi } = useWalletStore();

  useEffect(() => {
    const walletManager = new WalletManagerUi({ walletName: process.env.WALLET_NAME }, { logger: console, runtime });
    setWalletManagerUi(walletManager);
  }, [setWalletManagerUi]);

  useEffect(() => {
    if (!walletManagerUi?.wallet || subscription.current) return () => void 0;

    subscription.current = walletManagerUi?.wallet.addresses$.subscribe((knownAddresses) => {
      console.log('known addresses, received', knownAddresses);
      const currentKeyAgentData = getValueFromLocalStorage('keyAgentData');
      const nextKeyAgentData = {
        ...currentKeyAgentData,
        knownAddresses
      };

      saveValueInLocalStorage({
        key: 'keyAgentData',
        value: nextKeyAgentData
      });
      setAddressesDiscoveryCompleted(true);
    });

    return () => {
      if (!subscription.current) return;
      subscription.current.unsubscribe();
      subscription.current = null;
    };
  }, [walletManagerUi?.wallet, setAddressesDiscoveryCompleted]);
};
