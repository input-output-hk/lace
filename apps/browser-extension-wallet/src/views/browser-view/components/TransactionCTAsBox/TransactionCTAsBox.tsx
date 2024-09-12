/* eslint-disable react/no-multi-comp */
import React from 'react';
import { TransactionCTAs } from '@lace/core';
import { DrawerContent } from '@views/browser/components/Drawer';
import { DrawerHeader, DrawerNavigation } from '@lace/common';
import { useDrawer } from '../../stores';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext as useAnalytics } from '@providers/AnalyticsProvider';
import styles from './TransactionCTAsBox.module.scss';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import {
  SendFlowTriggerPoints,
  useAnalyticsSendFlowTriggerPoint,
  useOpenTransactionDrawer
} from '../../features/send-transaction';
import { useWalletStore } from '@stores';
import { Box, Flex, ToggleSwitch } from '@input-output-hk/lace-ui-toolkit';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useLocalStorage } from '@hooks';
import { Tooltip } from 'antd';

const useAdvancedReceived = process.env.USE_ADVANCED_RECEIVE === 'true';

export const TransactionCTAsBox = (): React.ReactElement => {
  const { isSharedWallet } = useWalletStore();
  const analytics = useAnalytics();
  const [config, setDrawerConfig] = useDrawer();
  const openSendTransactionDrawer = useOpenTransactionDrawer({ content: DrawerContent.SEND_TRANSACTION });
  const openCoSignTransactionDrawer = useOpenTransactionDrawer({ content: DrawerContent.CO_SIGN_TRANSACTION });
  const { setTriggerPoint } = useAnalyticsSendFlowTriggerPoint();
  const { t } = useTranslation();
  const [isReceiveInAdvancedMode, { updateLocalStorage: setIsReceiveInAdvancedMode }] = useLocalStorage(
    'isReceiveInAdvancedMode',
    false
  );

  const handleReceiveCloseIconClick = () => {
    const onClose = config?.onClose || (() => setDrawerConfig());
    onClose();
    analytics.sendEventToPostHog(PostHogAction.ReceiveYourWalletAddressXClick);
  };

  const openReceive = () => {
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
    analytics.sendEventToPostHog(PostHogAction.ReceiveClick);
  };

  const openSend = () => {
    // eslint-disable-next-line camelcase
    analytics.sendEventToPostHog(PostHogAction.SendClick, { trigger_point: SendFlowTriggerPoints.SEND_BUTTON });
    openSendTransactionDrawer();
    setTriggerPoint(SendFlowTriggerPoints.SEND_BUTTON);
  };

  return (
    <TransactionCTAs
      buttonClassName={styles.btn}
      onSendClick={openSend}
      onReceiveClick={openReceive}
      onCoSignClick={isSharedWallet ? openCoSignTransactionDrawer : undefined}
    />
  );
};
