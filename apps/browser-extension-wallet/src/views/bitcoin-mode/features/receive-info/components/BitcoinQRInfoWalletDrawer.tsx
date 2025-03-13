/* eslint-disable unicorn/no-null, consistent-return, sonarjs/cognitive-complexity */
import React, { useCallback, useEffect, useState } from 'react';
import { ADDRESS_CARD_QR_CODE_SIZE, AddressCard } from '@lace/core';
import { useTheme } from '@providers/ThemeProvider';
import styles from './BitcoinQRInfoWalletDrawer.module.scss';
import { useDrawer } from '@src/views/browser-view/stores';
import { getQRCodeOptions } from '@src/utils/qrCodeHelpers';
import {useKeyboardShortcut} from '@lace/common';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { useWalletManager} from '@hooks';
import isEqual from "lodash/isEqual";
import { Bitcoin } from "@lace/bitcoin";

export const BitcoinQRInfoWalletDrawer = (): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { theme } = useTheme();
  const [, closeDrawer] = useDrawer();
  const { bitcoinWallet } = useWalletManager();
  const [addresses, setAddresses] = useState<Bitcoin.DerivedAddress[]>([]);
  const [activeWalletName, setActiveWalletName] = useState<string>('');
  const { getActiveWalletName } = useWalletManager();

  useEffect(() => {
    getActiveWalletName().then((name) => {
      setActiveWalletName(name);
    })}, [getActiveWalletName]);

  useEffect(() => {
    const subscription = bitcoinWallet.addresses$.subscribe((newAddresses) => {
      setAddresses((prev) =>
        isEqual(prev, newAddresses) ? prev : newAddresses
      );
    });
    return () => subscription.unsubscribe();
  }, [bitcoinWallet]);

  useKeyboardShortcut(['Escape'], () => closeDrawer());

  const handleCopyAddress = () => {
    analytics.sendEventToPostHog(PostHogAction.ReceiveCopyAddressIconClick);
  };

  const getQRCodeOpts = useCallback(() => getQRCodeOptions(theme, ADDRESS_CARD_QR_CODE_SIZE), [theme]);


  return (
    <Flex flexDirection="column" justifyContent="space-between" alignItems="center">
      <div className={styles.infoContainer}>
        <Flex flexDirection="column" gap="$16">
          <AddressCard
            name={activeWalletName}
            address={addresses.length > 0 ? addresses[0].address : ''}
            getQRCodeOptions={getQRCodeOpts}
            onCopyClick={handleCopyAddress}
          />
        </Flex>
      </div>
    </Flex>
  );
};
