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
  AnalyticsEventActions,
  AnalyticsEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';

export const SendReceiveBox = (): React.ReactElement => {
  const analytics = useAnalytics();
  const [config, setDrawerConfig] = useDrawer();
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
    analytics.sendEvent({
      category: AnalyticsEventCategories.SEND_TRANSACTION,
      action: AnalyticsEventActions.CLICK_EVENT,
      name: AnalyticsEventNames.SendTransaction.SEND_TX_BUTTON_BROWSER
    });
    setDrawerConfig({ content: DrawerContent.SEND_TRANSACTION });
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
