import React, { useCallback, useState } from 'react';
import { ADDRESS_CARD_QR_CODE_SIZE_POPUP, AddressCard, HandleAddressCard } from '@lace/core';
import { Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from './ReceiveInfo.module.scss';
import { useTheme } from '@providers/ThemeProvider';
import { getQRCodeOptions } from '@src/utils/qrCodeHelpers';
import { HandleInfo } from '@cardano-sdk/wallet';
import { getAssetImageUrl } from '@src/utils/get-asset-image-url';
import { useAnalyticsContext, useBackgroundServiceAPIContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { Flex, Box, ToggleSwitch } from '@input-output-hk/lace-ui-toolkit';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { BrowserViewSections } from '@lib/scripts/types';
import { WarningModal } from '@src/views/browser-view/components';
import { useLocalStorage } from '@hooks';

const useAdvancedReceived = process.env.USE_ADVANCED_RECEIVE === 'true';

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
  const backgroundServices = useBackgroundServiceAPIContext();
  const [isSwitchToExpandedViewModalVisible, setIsSwitchToExpandedViewModalVisible] = useState(false);
  const [, { updateLocalStorage: setIsReceiveInAdvancedMode }] = useLocalStorage('isReceiveInAdvancedMode', false);
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

  const openTabExtensionReceiveFlow = () => {
    setIsReceiveInAdvancedMode(true);
    backgroundServices.handleOpenBrowser({ section: BrowserViewSections.RECEIVE_ADVANCED });
  };

  return (
    <>
      <Drawer
        open
        onClose={handleOnClose}
        title={
          <DrawerHeader
            title={t('qrInfo.receive')}
            subtitle={
              <Box className={styles.subTitle}>
                {t('qrInfo.scanQRCodeToConnectWallet')}
                {useAdvancedReceived && (
                  <Flex mt="$20" justifyContent="space-between">
                    <span>{t('qrInfo.advancedMode.toggle.label')}</span>
                    <ToggleSwitch
                      icon={
                        <Tooltip title={t('qrInfo.advancedMode.toggle.description')}>
                          <InfoCircleOutlined />
                        </Tooltip>
                      }
                      defaultChecked={isSwitchToExpandedViewModalVisible}
                      checked={isSwitchToExpandedViewModalVisible}
                      onCheckedChange={() => setIsSwitchToExpandedViewModalVisible(true)}
                      testId="advanced-mode-"
                    />
                  </Flex>
                )}
              </Box>
            }
          />
        }
        navigation={<DrawerNavigation onCloseIconClick={handleOnClose} />}
        popupView
      >
        <Flex className={styles.container} testId="receive-address-qr" flexDirection="column" gap="$16">
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
        </Flex>
      </Drawer>
      <WarningModal
        header={t('qrInfo.advancedMode.modal.title')}
        content={<span className={styles.removeWalletContent}>{t('qrInfo.advancedMode.modal.description')}</span>}
        visible={isSwitchToExpandedViewModalVisible}
        onCancel={() => setIsSwitchToExpandedViewModalVisible(false)}
        onConfirm={openTabExtensionReceiveFlow}
        cancelLabel={t('qrInfo.advancedMode.modal.cancel')}
        confirmLabel={t('qrInfo.advancedMode.modal.confirm')}
        confirmCustomClassName={styles.settingsConfirmButton}
        isPopupView
      />
    </>
  );
};
