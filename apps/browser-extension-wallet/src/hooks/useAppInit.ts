/* eslint-disable unicorn/no-null */
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import { useAddressesDiscoverer, useWalletManager } from '@hooks';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@stores';
import { getValueFromLocalStorage } from '@utils/local-storage';
import { useCallback, useEffect } from 'react';
import { runtime } from 'webextension-polyfill';

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
  const { cardanoWallet, environmentName, setHdDiscoveryStatus, setWalletInfo, setWalletManagerUi, walletManagerUi } =
    useWalletStore();
  const { updateAddresses } = useWalletManager();
  const { addressesDiscoverer, prepare: prepareAddressesDiscoverer } = useAddressesDiscoverer();

  useEffect(() => {
    const walletManager = new WalletManagerUi({ walletName: process.env.WALLET_NAME }, { logger: console, runtime });
    setWalletManagerUi(walletManager);
  }, [setWalletManagerUi]);

  useEffect(() => {
    (async () => {
      if (!cardanoWallet?.asyncKeyAgent) return;
      await prepareAddressesDiscoverer({ chainName: environmentName, asyncKeyAgent: cardanoWallet?.asyncKeyAgent });
    })();
  }, [cardanoWallet?.asyncKeyAgent, environmentName, prepareAddressesDiscoverer]);

  useEffect(() => {
    const subscription = addressesDiscoverer.status$.subscribe(setHdDiscoveryStatus);
    return () => {
      subscription.unsubscribe();
    };
  }, [addressesDiscoverer, setHdDiscoveryStatus]);

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
