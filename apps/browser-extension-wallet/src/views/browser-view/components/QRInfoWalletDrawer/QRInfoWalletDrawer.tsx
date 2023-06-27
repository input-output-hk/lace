import React from 'react';
import { InfoWallet } from '@lace/core';
import { useTheme } from '@providers/ThemeProvider';
import { useWalletStore } from '@src/stores';
import styles from './QRInfoWalletDrawer.module.scss';
import { useTranslation } from 'react-i18next';
import { useDrawer } from '../../stores';
import { getQRCodeOptions } from '@src/utils/qrCodeHelpers';
import { useKeyboardShortcut } from '@hooks';
import { useGetHandles } from '@hooks/useGetHandles';

const useWalletInformation = () =>
  useWalletStore((state) => ({
    name: state?.walletInfo?.name,
    address: state?.walletInfo?.addresses[0].address
  }));

export const QRInfoWalletDrawer = (): React.ReactElement => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { name, address } = useWalletInformation();
  const [, closeDrawer] = useDrawer();
  const handles = useGetHandles();

  const infoWalletTranslations = {
    copy: t('core.infoWallet.copy'),
    copiedMessage: t('core.infoWallet.addressCopied')
  };

  useKeyboardShortcut(['Escape'], () => closeDrawer());

  return (
    <div className={styles.infoContainer}>
      <InfoWallet
        getQRCodeOptions={() => getQRCodeOptions(theme)}
        walletInfo={{ name: (handles?.length && handles[0]?.nftMetadata.name) || name, qrData: address?.toString() }}
        translations={infoWalletTranslations}
      />
    </div>
  );
};
