import React from 'react';
import { useHistory } from 'react-router';

import { useWalletStore } from '@stores';
import { APP_MODE_POPUP } from '@src/utils/constants';

import { NotificationsCenter } from './NotificationsCenter';

export const NotificationsCenterContainer = (): React.ReactElement => {
  const history = useHistory();
  const { walletUI } = useWalletStore();

  return (
    <NotificationsCenter
      onBack={() => history.goBack()}
      onMarkAllAsRead={() => {
        // TODO connect with notifications center
        // eslint-disable-next-line no-console
        console.log('onMarkAllAsRead');
      }}
      popupView={walletUI.appMode === APP_MODE_POPUP}
    />
  );
};
