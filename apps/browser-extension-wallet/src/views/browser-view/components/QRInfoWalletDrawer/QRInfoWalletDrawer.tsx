import React from 'react';
import { InfoWallet } from '@lace/core';
import { useTheme } from '@providers/ThemeProvider';
import { useWalletStore } from '../../../../stores';
import styles from './QRInfoWalletDrawer.module.scss';
import { useTranslation } from 'react-i18next';
import { useDrawer } from '../../stores';
import { getQRCodeOptions } from '@src/utils/qrCodeHelpers';
import { useKeyboardShortcut } from '@hooks';
import { useFindNftByPolicyId } from '@hooks/useGetNftPolicyId';
import { ADA_HANDLE_POLICY_ID, isAdaHandleEnabled } from '@src/features/ada-handle/config';

const useWalletInformation = () =>
  useWalletStore((state) => ({
    name: state?.walletInfo?.name,
    address: state?.walletInfo?.address
  }));

export const QRInfoWalletDrawer = (): React.ReactElement => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { name, address } = useWalletInformation();
  const [, closeDrawer] = useDrawer();
  const handle = useFindNftByPolicyId(ADA_HANDLE_POLICY_ID);

  const infoWalletTranslations = {
    copy: t('core.infoWallet.copy'),
    copiedMessage: t('core.infoWallet.addressCopied')
  };

  useKeyboardShortcut(['Escape'], () => closeDrawer());

  return (
    <div className={styles.infoContainer}>
      <InfoWallet
        getQRCodeOptions={() => getQRCodeOptions(theme)}
        walletInfo={{ name: (isAdaHandleEnabled === 'true' && handle?.name) || name, qrData: address.toString() }}
        translations={infoWalletTranslations}
      />
    </div>
  );
};
