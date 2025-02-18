import React, { useEffect, useState } from 'react';
import { useRedirection, useWalletManager } from '@hooks';
import { walletRoutePaths } from '../../../wallet-paths';
import { ReceiveInfo } from './ReceiveInfo';
import { BitcoinWallet } from "@lace/bitcoin";
import isEqual from "lodash/isEqual";
import { useWalletStore } from "@stores";

export const ReceiveInfoContainer = (): React.ReactElement => {
  const redirectToOverview = useRedirection(walletRoutePaths.assets);
  const { bitcoinWallet } = useWalletManager();
  const [addresses, setAddresses] = useState<BitcoinWallet.DerivedAddress[]>([]);
  const { walletInfo } = useWalletStore();

  useEffect(() => {
    const subscription = bitcoinWallet.addresses$.subscribe((newAddresses) => {
      setAddresses((prev) =>
        isEqual(prev, newAddresses) ? prev : newAddresses
      );
    });
    return () => subscription.unsubscribe();
  }, [bitcoinWallet]);

  return (
    <ReceiveInfo
      name={walletInfo?.name}
      address={addresses.length > 0 ? addresses[0].address : ''}
      goBack={redirectToOverview}
    />
  );
};
