/* eslint-disable react/no-multi-comp */
import React from 'react';
import { SendReceive } from '@lace/core';
import { DrawerContent } from '@views/browser/components/Drawer';
import { DrawerNavigation, DrawerHeader } from '@lace/common';
import { useDrawer } from '../../stores';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext as useAnalytics } from '@providers/AnalyticsProvider';
import styles from './SendReceiveBox.module.scss';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { SendFlowTriggerPoints, useAnalyticsSendFlowTriggerPoint } from '../../features/send-transaction';

export const SendReceiveBox = (): React.ReactElement => {
  const analytics = useAnalytics();
  const [config, setDrawerConfig] = useDrawer();
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
          title={<div>{t('core.sendReceive.receive')}</div>}
          onCloseIconClick={handleReceiveCloseIconClick}
        />
      )
    });
    analytics.sendEventToPostHog(PostHogAction.ReceiveClick);
  };

  const openSend = () => {
    // eslint-disable-next-line camelcase
    analytics.sendEventToPostHog(PostHogAction.SendClick, { trigger_point: SendFlowTriggerPoints.SEND_BUTTON });
    setDrawerConfig({ content: DrawerContent.SEND_TRANSACTION });
    setTriggerPoint(SendFlowTriggerPoints.SEND_BUTTON);
  };

  const sendReceiveTranslation = {
    send: t('core.sendReceive.send'),
    receive: t('core.sendReceive.receive')
  };

  return (
    <SendReceive
      sharedClass={styles.btn}
      isReversed
      leftButtonOnClick={openSend}
      rightButtonOnClick={openReceive}
      translations={sendReceiveTranslation}
    />
  );
};
