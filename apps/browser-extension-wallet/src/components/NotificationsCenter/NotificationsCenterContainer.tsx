import React from 'react';
import { useHistory } from 'react-router';

import { useWalletStore } from '@stores';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { useNotificationsCenter } from '@hooks/useNotificationsCenter';

import { NotificationsCenter } from './NotificationsCenter';

export const NotificationsCenterContainer = (): React.ReactElement => {
  const history = useHistory();
  const { walletUI } = useWalletStore();
  const { markAsRead, notifications, topics, unreadNotifications } = useNotificationsCenter();

  return (
    <NotificationsCenter
      notifications={notifications}
      onBack={() => history.goBack()}
      onMarkAllAsRead={() => markAsRead()}
      onMarkAsRead={(id: string) => void markAsRead(id)}
      popupView={walletUI.appMode === APP_MODE_POPUP}
      topics={topics}
      unreadNotifications={unreadNotifications}
    />
  );
};
