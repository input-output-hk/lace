/* eslint-disable unicorn/no-null */
import { Shutdown } from '@cardano-sdk/util';
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import { useWalletManager } from '@hooks';
import { Wallet } from '@lace/cardano';
import { consumeAddressesDiscoverer, exposeKeyAgent } from '@lib/communication';
import { useWalletStore } from '@stores';
import { getValueFromLocalStorage } from '@utils/local-storage';
import { useCallback, useEffect } from 'react';
import { runtime } from 'webextension-polyfill';

const addressesDiscoverer = consumeAddressesDiscoverer();
let shutdownExposedKeyAgent: Shutdown['shutdown'];

// TODO: for now just to have a way to trigger it. Soon it will be triggered with a button in settings
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.addressesDiscoverer = addressesDiscoverer;

type UseAddressesListenerCallbackParams = {
  addresses?: Wallet.KeyManagement.GroupedAddress[] | null;
  error?: Error;
};

type UseAddressesListenerCallback = (params: UseAddressesListenerCallbackParams) => Promise<void>;

const useAddressesListener = (callback: UseAddressesListenerCallback) => {
  useEffect(() => {
    const subscription = addressesDiscoverer.addresses$.subscribe({
      error: (error) => callback({ error }),
      next: (addresses) => callback({ addresses })
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [callback]);
};

export const useAppInit = (): void => {
  const { cardanoWallet, environmentName, setWalletInfo, setWalletManagerUi, walletManagerUi } = useWalletStore();
  const { getPassword, updateAddresses } = useWalletManager();

  useEffect(() => {
    const walletManager = new WalletManagerUi({ walletName: process.env.WALLET_NAME }, { logger: console, runtime });
    setWalletManagerUi(walletManager);
  }, [setWalletManagerUi]);

  useEffect(() => {
    (async () => {
      if (!walletManagerUi || !cardanoWallet?.asyncKeyAgent) return;
      shutdownExposedKeyAgent?.();
      const { channelName, shutdown } = await exposeKeyAgent(cardanoWallet?.asyncKeyAgent);
      shutdownExposedKeyAgent = shutdown;
      await addressesDiscoverer.setup(channelName);
    })();
  }, [cardanoWallet?.asyncKeyAgent, getPassword, walletManagerUi]);

  useAddressesListener(
    useCallback(
      async ({ addresses }) => {
        if (!addresses) return;
        const { name } = getValueFromLocalStorage('wallet');
        setWalletInfo({
          name: name ?? 'Lace',
          addresses
        });
      },
      [setWalletInfo]
    )
  );

  useAddressesListener(
    useCallback(
      async ({ addresses, error }) => {
        console.info('DEBUG Result', addresses, error);
        if (error) {
          // hide overlay
          // show error toast
          console.info('DEBUG Error toast');
          return;
        }
        if (addresses === null) {
          console.info('DEBUG Overlay');
          // show overlay
          return;
        }
        if (addresses.length === 0) return;
        console.info('DEBUG Success toast', addresses);
        // hide overlay
        // show success toast
        await updateAddresses({
          addresses,
          currentChainName: environmentName
        });
      },
      [environmentName, updateAddresses]
    )
  );
};
