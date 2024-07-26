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

export const TransactionCTAsBox = (): React.ReactElement => {
  const { isSharedWallet } = useWalletStore();
  const analytics = useAnalytics();
  const [config, setDrawerConfig] = useDrawer();
  const openSendTransactionDrawer = useOpenTransactionDrawer({ content: DrawerContent.SEND_TRANSACTION });
  const openCoSignTransactionDrawer = useOpenTransactionDrawer({ content: DrawerContent.CO_SIGN_TRANSACTION });
  const { setTriggerPoint } = useAnalyticsSendFlowTriggerPoint();
  const { t } = useTranslation();

  const handleReceiveCloseIconClick = () => {
    const onClose = config?.onClose || (() => setDrawerConfig());
    onClose();
    analytics.sendEventToPostHog(PostHogAction.ReceiveYourWalletAddressXClick);
  };

  const openReceive = () => {
    setDrawerConfig({
      content: DrawerContent.RECEIVE_TRANSACTION,
      renderTitle: () => <DrawerHeader title={t('qrInfo.title')} subtitle={t('qrInfo.scanQRCodeToConnectWallet')} />,
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
