/* eslint-disable unicorn/no-null */
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { useBackgroundServiceAPIContext } from '@providers';
import { useWalletStore } from '@stores';
import { getValueFromLocalStorage, saveValueInLocalStorage } from '@utils/local-storage';
import { useEffect } from 'react';
import { runtime } from 'webextension-polyfill';

export const useAppInit = (): void => {
  const { environmentName, setAddressesDiscoveryCompleted, setWalletManagerUi, walletManagerUi } = useWalletStore();
  const backgroundService = useBackgroundServiceAPIContext();

  useEffect(() => {
    const walletManager = new WalletManagerUi({ walletName: process.env.WALLET_NAME }, { logger: console, runtime });
    setWalletManagerUi(walletManager);
  }, [setWalletManagerUi]);

  useEffect(() => {
    if (!walletManagerUi?.wallet) return () => void 0;

    const subscription = walletManagerUi.wallet.addresses$.subscribe(async (knownAddresses) => {
      const backgroundStorage = await backgroundService.getBackgroundStorage();
      const currentKeyAgentData = getValueFromLocalStorage('keyAgentData');

      if (!backgroundStorage || !currentKeyAgentData) return;
      const { keyAgentsByChain } = backgroundStorage;

      const nextKeyAgentData: Wallet.KeyManagement.SerializableKeyAgentData = {
        ...currentKeyAgentData,
        knownAddresses
      };

      saveValueInLocalStorage({
        key: 'keyAgentData',
        value: nextKeyAgentData
      });
      keyAgentsByChain[environmentName].keyAgentData = nextKeyAgentData;
      await backgroundService.setBackgroundStorage({ keyAgentsByChain });

      setAddressesDiscoveryCompleted(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [backgroundService, environmentName, setAddressesDiscoveryCompleted, walletManagerUi?.wallet]);
};
