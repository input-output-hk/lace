import React from 'react';
import { InfoWallet, useSharedWalletData } from '@lace/core';
import { useTheme } from '@providers/ThemeProvider';
import { useWalletStore } from '../../../../stores';
import { useTranslation } from 'react-i18next';
import styles from './QRPublicKeyDrawer.module.scss';
import { getQRCodeOptions } from '@src/utils/qrCodeHelpers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useCurrentWallet } from '@hooks';

const useWalletInformation = () => {
  const wallet = useCurrentWallet();
  const { sharedWalletKey } = useSharedWalletData(wallet);
  return useWalletStore((state) => ({
    name: state?.walletInfo?.name,
    publicKey: state?.isSharedWallet ? sharedWalletKey : state?.cardanoWallet.source.account.extendedAccountPublicKey
  }));
};

export const QRPublicKeyDrawer = ({
  isPopup,
  sendAnalyticsEvent
}: {
  isPopup?: boolean;
  sendAnalyticsEvent?: (event: PostHogAction) => void;
}): React.ReactElement => {
  const { name, publicKey } = useWalletInformation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const infoWalletTranslations = {
    copy: t('core.infoWallet.copy'),
    copiedMessage: t('general.clipboard.copiedToClipboard')
  };

  return (
    <div className={styles.container}>
      <InfoWallet
        onClick={() => sendAnalyticsEvent(PostHogAction.SettingsYourKeysShowPublicKeyCopyClick)}
        // eslint-disable-next-line no-magic-numbers
        getQRCodeOptions={() => getQRCodeOptions(theme, isPopup && 168)}
        isPopupView={isPopup}
        walletInfo={{ name, qrData: publicKey?.toString() }}
        translations={infoWalletTranslations}
      />
    </div>
  );
};
