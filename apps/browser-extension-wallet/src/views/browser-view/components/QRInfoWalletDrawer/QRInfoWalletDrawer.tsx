import React, { useCallback } from 'react';
import { ADDRESS_CARD_QR_CODE_SIZE, AddressCard, HandleAddressCard } from '@lace/core';
import { useTheme } from '@providers/ThemeProvider';
import { useWalletStore } from '@src/stores';
import styles from './QRInfoWalletDrawer.module.scss';
import { useTranslation } from 'react-i18next';
import { useDrawer } from '../../stores';
import { getQRCodeOptions } from '@src/utils/qrCodeHelpers';
import { useKeyboardShortcut } from '@lace/common';
import { useGetHandles } from '@hooks/useGetHandles';
import { getAssetImageUrl } from '@src/utils/get-asset-image-url';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

const useWalletInformation = () =>
  useWalletStore((state) => ({
    name: state?.walletInfo?.name,
    address: state?.walletInfo?.addresses[0].address
  }));

export const QRInfoWalletDrawer = (): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { name, address } = useWalletInformation();
  const [, closeDrawer] = useDrawer();
  const handles = useGetHandles();

  useKeyboardShortcut(['Escape'], () => closeDrawer());

  const handleCopyAdaHandle = () => {
    analytics.sendEventToPostHog(PostHogAction.ReceiveCopyADAHandleIconClick);
  };

  const handleCopyAddress = () => {
    analytics.sendEventToPostHog(PostHogAction.ReceiveCopyAddressIconClick);
  };

  return (
    <div className={styles.infoContainer}>
      <AddressCard
        name={name}
        address={address?.toString()}
        getQRCodeOptions={useCallback(() => getQRCodeOptions(theme, ADDRESS_CARD_QR_CODE_SIZE), [theme])}
        copiedMessage={t('core.infoWallet.addressCopied')}
        onCopyClick={handleCopyAddress}
      />
      {handles?.map(({ nftMetadata, image }) => (
        <HandleAddressCard
          key={nftMetadata.name}
          name={nftMetadata.name}
          image={getAssetImageUrl(image || nftMetadata.image)}
          copiedMessage={t('core.infoWallet.handleCopied')}
          onCopyClick={handleCopyAdaHandle}
        />
      ))}
    </div>
  );
};
