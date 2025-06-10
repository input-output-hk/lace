import { useObservable } from '@lace/common';
import { useWalletStore } from '@stores';
import { useEffect, useMemo } from 'react';
import { isKeyHashAddress } from '@cardano-sdk/wallet';
import { AddressesDiscoveryStatus } from '@lib/communication/addresses-discoverer';
import { useWalletManager } from './useWalletManager';
import { useWalletState } from './useWalletState';
import { setBackgroundStorage } from '@lib/scripts/background/storage';
import { useCustomSubmitApi } from '@hooks/useCustomSubmitApi';
import { bitcoinWalletManager } from '@lib/wallet-api-ui';
import { useCurrentBlockchain } from '@src/multichain';

export const useAppInit = (): void => {
  const {
    setWalletInfo,
    walletInfo,
    initialHdDiscoveryCompleted,
    cardanoWallet,
    setWalletState,
    setAddressesDiscoveryCompleted,
    setHdDiscoveryStatus,
    deletingWallet
  } = useWalletStore();
  const { blockchain } = useCurrentBlockchain();
  const { loadWallet, walletManager, walletRepository } = useWalletManager();
  const walletState = useWalletState();
  const { environmentName, currentChain } = useWalletStore();
  const { getCustomSubmitApiForNetwork } = useCustomSubmitApi();

  useEffect(() => {
    setWalletState(walletState);
  }, [walletState, setWalletState]);

  const addresses = walletState?.addresses;
  useEffect(() => {
    if (!cardanoWallet || !addresses) return;

    setWalletInfo({
      name: cardanoWallet.source.wallet.metadata.name,
      // TODO: script address support LW-9574
      // eslint-disable-next-line unicorn/no-array-callback-reference
      addresses: addresses.filter(isKeyHashAddress)
    });

    setHdDiscoveryStatus(addresses.length > 0 ? AddressesDiscoveryStatus.Idle : AddressesDiscoveryStatus.InProgress);
  }, [cardanoWallet, addresses, setWalletInfo, setHdDiscoveryStatus]);

  useEffect(() => {
    if (walletInfo && walletInfo.addresses.length > 0 && !initialHdDiscoveryCompleted) {
      setAddressesDiscoveryCompleted(true);
    }
  }, [walletInfo, initialHdDiscoveryCompleted, setAddressesDiscoveryCompleted]);

  useEffect(() => {
    (async () => {
      environmentName &&
        (await setBackgroundStorage({ customSubmitTxUrl: getCustomSubmitApiForNetwork(environmentName).url }));
    })();
  }, [environmentName, getCustomSubmitApiForNetwork]);

  const wallets = useObservable(walletRepository.wallets$);
  const activeCardanoWalletProps = useObservable(walletManager.activeWalletId$);
  const activeBitcoinWalletProps = useObservable(bitcoinWalletManager.activeWalletId$);
  const activeWalletProps = useMemo(
    () =>
      blockchain === 'bitcoin'
        ? activeBitcoinWalletProps && currentChain && { ...activeBitcoinWalletProps, chainId: currentChain }
        : activeCardanoWalletProps,
    [blockchain, activeCardanoWalletProps, activeBitcoinWalletProps, currentChain]
  );

  useEffect(() => {
    if (deletingWallet || typeof wallets === 'undefined' || typeof activeWalletProps === 'undefined') return;
    void loadWallet(wallets, activeWalletProps);
  }, [loadWallet, activeWalletProps, wallets, deletingWallet]);
};
