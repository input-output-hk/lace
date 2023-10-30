/* eslint-disable unicorn/no-null */
import { Shutdown } from '@cardano-sdk/util';
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import { useWalletManager } from '@hooks';
import { Wallet } from '@lace/cardano';
import { AddressesDiscoveryStatus, consumeAddressesDiscoverer, exposeKeyAgent } from '@lib/communication';
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

const useAddressesListener = (
  callback: (addresses: Wallet.KeyManagement.GroupedAddress[]) => void | Promise<void>,
  wallet?: Wallet.ObservableWallet
) => {
  useEffect(() => {
    if (!wallet) return () => void 0;
    const subscription = wallet.addresses$.subscribe(callback);
    return () => {
      subscription.unsubscribe();
    };
  }, [wallet, callback]);
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
      await addressesDiscoverer.setup({ chainName: environmentName, keyAgentChannelName: channelName });
    })();
  }, [cardanoWallet?.asyncKeyAgent, environmentName, getPassword, walletManagerUi]);

  useEffect(() => {
    addressesDiscoverer.status$.subscribe((status) => {
      if (status === AddressesDiscoveryStatus.InProgress) {
        console.info('DEBUG Overlay');
        // show overlay
      }
      if (status === AddressesDiscoveryStatus.Error) {
        // hide overlay
        // show error toast
        console.info('DEBUG Error toast');
      }
      if (status === AddressesDiscoveryStatus.Idle) {
        console.info('DEBUG Success toast');
        // hide overlay
        // if (prevStatus === AddressesDiscoveryStatus.InProgress) {
        //   show success toast
        // }
      }
    });
  }, []);

  useAddressesListener(
    useCallback(
      async (addresses) => {
        if (!addresses) return;
        const { name } = getValueFromLocalStorage('wallet');
        setWalletInfo({
          name: name ?? 'Lace',
          addresses
        });
      },
      [setWalletInfo]
    ),
    walletManagerUi?.wallet
  );

  useAddressesListener(
    useCallback(
      async (addresses) => {
        if (addresses.length === 0) return;
        await updateAddresses({
          addresses,
          currentChainName: environmentName
        });
      },
      [environmentName, updateAddresses]
    ),
    walletManagerUi?.wallet
  );
};
