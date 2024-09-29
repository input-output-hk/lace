/* eslint-disable react/no-multi-comp */
import React, { useCallback } from 'react';
import { DrawerContent } from '@src/views/browser-view/components/Drawer/DrawerUIContent';
import styles from './TransactionCTAsBox.module.scss';
import { useDrawer } from '@views/browser/stores';
import { Box, Flex, ToggleSwitch } from '@input-output-hk/lace-ui-toolkit';
import { DrawerHeader, DrawerNavigation, PostHogAction } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from '@hooks';
import { useAnalyticsContext } from '@providers';
import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const useAdvancedReceived = process.env.USE_ADVANCED_RECEIVE === 'true';

export const useOpenReceiveDrawer = (): (() => void) => {
  const [config, setDrawerConfig] = useDrawer();
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();
  const [isReceiveInAdvancedMode, { updateLocalStorage: setIsReceiveInAdvancedMode }] = useLocalStorage(
    'isReceiveInAdvancedMode',
    false
  );

  const handleReceiveCloseIconClick = useCallback(() => {
    const onClose = config?.onClose || (() => setDrawerConfig());
    onClose();
    analytics.sendEventToPostHog(PostHogAction.ReceiveYourWalletAddressXClick);
  }, [analytics, config?.onClose, setDrawerConfig]);

  return useCallback(() => {
    setDrawerConfig({
      content: DrawerContent.RECEIVE_TRANSACTION,
      renderTitle: () => (
        <Flex justifyContent="space-between" alignItems="center" className={styles.title}>
          <Box>
            <DrawerHeader title={t('qrInfo.title')} subtitle={t('qrInfo.scanQRCodeToConnectWallet')} />
          </Box>
          {useAdvancedReceived && (
            <ToggleSwitch
              icon={
                <Tooltip title={t('qrInfo.advancedMode.toggle.description')}>
                  <InfoCircleOutlined />
                </Tooltip>
              }
              defaultChecked={isReceiveInAdvancedMode}
              label={t('qrInfo.advancedMode.toggle.label')}
              onCheckedChange={(isChecked) => setIsReceiveInAdvancedMode(isChecked)}
              testId="advanced-mode-"
            />
          )}
        </Flex>
      ),
      renderHeader: () => (
        <DrawerNavigation
          title={<div>{t('browserView.receiveDrawer.title')}</div>}
          onCloseIconClick={handleReceiveCloseIconClick}
        />
      )
    });
  }, [handleReceiveCloseIconClick, isReceiveInAdvancedMode, setDrawerConfig, setIsReceiveInAdvancedMode, t]);
};
