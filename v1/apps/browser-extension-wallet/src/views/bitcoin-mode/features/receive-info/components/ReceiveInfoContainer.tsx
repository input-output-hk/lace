/* eslint-disable promise/catch-or-return */
import React, { useEffect, useState } from 'react';
import { useRedirection, useWalletManager } from '@hooks';
import { walletRoutePaths } from '../../../wallet-paths';
import { ReceiveInfo } from './ReceiveInfo';
import { Bitcoin } from '@lace/bitcoin';
import isEqual from 'lodash/isEqual';

export const ReceiveInfoContainer = (): React.ReactElement => {
  const redirectToOverview = useRedirection(walletRoutePaths.assets);
  const { bitcoinWallet } = useWalletManager();
  const [addresses, setAddresses] = useState<Bitcoin.DerivedAddress[]>([]);
  const [activeWalletName, setActiveWalletName] = useState<string>('');
  const { getActiveWalletName } = useWalletManager();

  useEffect(() => {
    getActiveWalletName().then((name) => {
      setActiveWalletName(name);
    });
  }, [getActiveWalletName]);

  useEffect(() => {
    const subscription = bitcoinWallet.addresses$.subscribe((newAddresses) => {
      setAddresses((prev) => (isEqual(prev, newAddresses) ? prev : newAddresses));
    });
    return () => subscription.unsubscribe();
  }, [bitcoinWallet]);

  return (
    <ReceiveInfo
      name={activeWalletName}
      address={addresses.length > 0 ? addresses[0].address : ''}
      goBack={redirectToOverview}
    />
  );
};
