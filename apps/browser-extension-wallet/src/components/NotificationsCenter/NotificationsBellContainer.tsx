import React, { useState } from 'react';
import { useHistory } from 'react-router';
import { Dropdown } from 'antd';

import { walletRoutePaths } from '@routes';
import { useNotificationsCenter } from '@hooks/useNotificationsCenter';
import { useNotificationsCenterConfig } from '@hooks/useNotificationsCenterConfig';

import { NotificationsBell } from './NotificationsBell';
import { NotificationsDropDown } from './NotificationsDropDown';

export interface NotificationsCenterContainerProps {
  popupView?: boolean;
}

export const NotificationsBellContainer = ({ popupView }: NotificationsCenterContainerProps): React.ReactElement => {
  const { isNotificationsCenterEnabled } = useNotificationsCenterConfig();
  const { markAsRead, notifications, unreadNotifications } = useNotificationsCenter();
  const history = useHistory();
  const [isOpen, setIsOpen] = useState(false);

  const handleViewAll = () => {
    setIsOpen(false);
    history.push(walletRoutePaths.notifications);
  };

  return (
    isNotificationsCenterEnabled && (
      <Dropdown
        onOpenChange={setIsOpen}
        open={isOpen}
        dropdownRender={() => (
          <NotificationsDropDown
            notifications={notifications}
            onMarkAllAsRead={() => markAsRead()}
            onMarkAsRead={(id: string) => markAsRead(id)}
            onViewAll={handleViewAll}
            popupView={popupView}
            unreadNotifications={unreadNotifications}
          />
        )}
        placement="bottomRight"
        trigger={['click']}
      >
        <NotificationsBell onClick={() => setIsOpen(!isOpen)} unreadNotifications={unreadNotifications} />
      </Dropdown>
    )
  );
};
