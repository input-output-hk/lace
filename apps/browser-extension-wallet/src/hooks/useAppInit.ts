import { useObservable } from '@lace/common';
import { useWalletStore } from '@stores';
import { useEffect } from 'react';
import { isKeyHashAddress } from '@cardano-sdk/wallet';
import { AddressesDiscoveryStatus } from '@lib/communication/addresses-discoverer';

export const useAppInit = (): void => {
  const {
    setWalletInfo,
    walletInfo,
    initialHdDiscoveryCompleted,
    cardanoWallet,
    setAddressesDiscoveryCompleted,
    setHdDiscoveryStatus
  } = useWalletStore();

  const addresses = useObservable(cardanoWallet?.wallet?.addresses$);
  useEffect(() => {
    if (!cardanoWallet || !addresses) return;
    if (!cardanoWallet.source.account) {
      throw new Error('Script wallet support is not implemented');
    }
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
};
