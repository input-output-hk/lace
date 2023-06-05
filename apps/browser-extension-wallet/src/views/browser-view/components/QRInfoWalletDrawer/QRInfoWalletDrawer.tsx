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
import { Wallet } from '@lace/cardano';

const isAdaHandleEnabled = process.env.USE_ADA_HANDLE;
const ADA_HANDLE_POLICY_ID = Wallet.Cardano.PolicyId('f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a');

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
