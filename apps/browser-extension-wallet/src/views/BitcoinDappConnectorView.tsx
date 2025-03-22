import React, { ReactElement, useCallback, useEffect } from 'react';
import { DappError } from '@src/features/dapp/components/DappError';
import { removePreloaderIfExists } from '@utils/remove-reloader-if-exists';
import { tabs } from 'webextension-polyfill';
import { walletRoutePaths } from '@routes';
import { MainLayout } from '@components/Layout';

export const BitcoinDappConnectorView = (): ReactElement => {
  useEffect(() => {
    removePreloaderIfExists();
  }, []);

  const onCloseClick = useCallback(() => {
    tabs.create({ url: `app.html#${walletRoutePaths.setup.home}` });
    window.close();
  }, []);

  return (
    <MainLayout useSimpleHeader hideFooter showAnnouncement={false}>
      <DappError
        title="Bitcoin Wallet"
        description="Bitcoin Wallet is not supported in this version of the extension."
        closeButtonLabel="Close"
        onCloseClick={onCloseClick}
        containerTestId="no-wallet-container"
        imageTestId="no-wallet-image"
        titleTestId="no-wallet-heading"
        descriptionTestId="no-wallet-description"
        closeButtonTestId="create-or-restore-wallet-btn"
      />
    </MainLayout>
  );
};
