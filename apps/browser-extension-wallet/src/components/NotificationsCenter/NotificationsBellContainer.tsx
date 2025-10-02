import React, { useState } from 'react';
import { useHistory } from 'react-router';
import { Dropdown } from 'antd';

import { walletRoutePaths } from '@routes';

import { NotificationsBell } from './NotificationsBell';
import { NotificationsDropDown } from './NotificationsDropDown';
import { useNotificationsCenterConfig } from '@hooks/useNotificationsCenterConfig';

export interface NotificationsCenterContainerProps {
  popupView?: boolean;
}

export const NotificationsBellContainer = ({ popupView }: NotificationsCenterContainerProps): React.ReactElement => {
  const history = useHistory();
  const [isOpen, setIsOpen] = useState(false);
  const { isNotificationsCenterEnabled } = useNotificationsCenterConfig();

  // TODO Connect with notifications center
  const [notifications, setNotifications] = useState<string[]>([]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    // TODO remove this placeholder logic
    if (!open) {
      setNotifications(
        // eslint-disable-next-line no-magic-numbers
        notifications.length === 11 ? [] : [...notifications, `Notification ${notifications.length + 1}`]
      );
    }
  };

  const handleMarkAllAsRead = () => {
    // TODO remove this placeholder logic
    setNotifications([]);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    history.push(walletRoutePaths.notifications);
  };

  return (
    isNotificationsCenterEnabled && (
      <Dropdown
        onOpenChange={handleOpenChange}
        open={isOpen}
        dropdownRender={() => (
          <NotificationsDropDown
            notifications={notifications}
            onMarkAllAsRead={handleMarkAllAsRead}
            onViewAll={handleViewAll}
            popupView={popupView}
          />
        )}
        placement="bottomRight"
        trigger={['click']}
      >
        <NotificationsBell onClick={() => setIsOpen(!isOpen)} unreadNotifications={notifications.length} />
      </Dropdown>
    )
  );
};
