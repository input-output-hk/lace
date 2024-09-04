import React, { useCallback } from 'react';
import { ADDRESS_CARD_QR_CODE_SIZE_POPUP, AddressCard, HandleAddressCard } from '@lace/core';
import { Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from './ReceiveInfo.module.scss';
import { useTheme } from '@providers/ThemeProvider';
import { getQRCodeOptions } from '@src/utils/qrCodeHelpers';
import { HandleInfo } from '@cardano-sdk/wallet';
import { getAssetImageUrl } from '@src/utils/get-asset-image-url';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

export interface ReceiveInfoProps {
  name: string;
  address: string;
  handles?: HandleInfo[];
  goBack: () => void;
}

export const ReceiveInfo = ({ name, address, handles, goBack }: ReceiveInfoProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const handleOnClose = () => {
    goBack();
    analytics.sendEventToPostHog(PostHogAction.ReceiveYourWalletAddressXClick);
  };

  const handleCopyAdaHandle = () => {
    analytics.sendEventToPostHog(PostHogAction.ReceiveCopyADAHandleIconClick);
  };

  const handleCopyAddress = () => {
    analytics.sendEventToPostHog(PostHogAction.ReceiveCopyAddressIconClick);
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
        <AddressCard
          name={name}
          isPopupView
          address={address?.toString()}
          getQRCodeOptions={useCallback(() => getQRCodeOptions(theme, ADDRESS_CARD_QR_CODE_SIZE_POPUP), [theme])}
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
    </Drawer>
  );
};
