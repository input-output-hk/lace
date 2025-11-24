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
  const { unreadNotifications } = useNotificationsCenter();
  const history = useHistory();
  const [isOpen, setIsOpen] = useState(false);

  const handleDropdownState = (openDropdown: boolean) => {
    setIsOpen(openDropdown);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    history.push(walletRoutePaths.notifications);
  };

  return (
    isNotificationsCenterEnabled && (
      <Dropdown
        open={isOpen}
        onOpenChange={handleDropdownState}
        dropdownRender={() => (
          <NotificationsDropDown onViewAll={handleViewAll} popupView={popupView} onClose={() => setIsOpen(false)} />
        )}
        placement="bottomRight"
        trigger={['click']}
      >
        <NotificationsBell onClick={() => setIsOpen(!isOpen)} unreadNotifications={unreadNotifications} />
      </Dropdown>
    )
  );
};
