/* eslint-disable react/no-multi-comp */
import React from 'react';
import { SendReceive } from '@lace/core';
import { DrawerContent } from '@views/browser/components/Drawer';
import { DrawerNavigation, DrawerHeader } from '@lace/common';
import { useDrawer } from '../../stores';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext as useAnalytics } from '@providers/AnalyticsProvider';
import styles from './SendReceiveBox.module.scss';
import {
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsEventNames,
  PostHogAction
} from '@providers/AnalyticsProvider/analyticsTracker';
import { SendFlowAnalyticsProperties, useTriggerPoint } from '../../features/send-transaction';

export const SendReceiveBox = (): React.ReactElement => {
  const analytics = useAnalytics();
  const [config, setDrawerConfig] = useDrawer();
  const { setTriggerPoint } = useTriggerPoint();
  const { t } = useTranslation();

  const openReceive = () =>
    setDrawerConfig({
      content: DrawerContent.RECEIVE_TRANSACTION,
      renderTitle: () => <DrawerHeader title={t('qrInfo.title')} subtitle={t('qrInfo.scanQRCodeToConnectWallet')} />,
      renderHeader: () => (
        <DrawerNavigation
          title={<div>{t('core.sendReceive.receive')}</div>}
          onCloseIconClick={config?.onClose || (() => setDrawerConfig())}
        />
      )
    });
  const openSend = () => {
    // eslint-disable-next-line camelcase
    const postHogProperties: SendFlowAnalyticsProperties = { trigger_point: 'send button' };
    analytics.sendEventToMatomo({
      category: MatomoEventCategories.SEND_TRANSACTION,
      action: MatomoEventActions.CLICK_EVENT,
      name: AnalyticsEventNames.SendTransaction.SEND_TX_BUTTON_BROWSER
    });
    analytics.sendEventToPostHog(PostHogAction.SendClick, postHogProperties);
    setDrawerConfig({ content: DrawerContent.SEND_TRANSACTION });
    setTriggerPoint('send button');
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
