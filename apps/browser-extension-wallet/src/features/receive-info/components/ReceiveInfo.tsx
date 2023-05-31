import React from 'react';
import { InfoWallet } from '@lace/core';
import { Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from './ReceiveInfo.module.scss';
import { WalletInfo } from '@src/types';
import { useTheme } from '@providers/ThemeProvider';
import { getQRCodeOptions } from '@src/utils/qrCodeHelpers';

const QR_SIZE = 168;

export interface ReceiveInfoProps {
  /**
   * Wallet basic information
   */
  wallet: WalletInfo;
  /**
   * Redirection when pressing the back button
   */
  goBack: () => void;
}

export const ReceiveInfo = ({ wallet, goBack }: ReceiveInfoProps): React.ReactElement => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const handleOnClose = () => goBack();

  const infoWalletTranslations = {
    copy: t('core.infoWallet.copy'),
    copiedMessage: t('core.infoWallet.addressCopied')
  };

  return (
    <Drawer
      visible
      onClose={handleOnClose}
      title={<DrawerHeader title={t('qrInfo.receive')} subtitle={t('qrInfo.scanQRCodeToConnectWallet')} />}
      navigation={<DrawerNavigation onCloseIconClick={handleOnClose} />}
      popupView
    >
      <div className={styles.container} data-testid="receive-address-qr">
        <InfoWallet
          getQRCodeOptions={() => getQRCodeOptions(theme, QR_SIZE)}
          isPopupView
          walletInfo={{ ...wallet, qrData: wallet.address.toString() }}
          translations={infoWalletTranslations}
        />
      </div>
    </Drawer>
  );
};
