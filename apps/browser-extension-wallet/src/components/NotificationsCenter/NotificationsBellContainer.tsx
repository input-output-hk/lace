import React, { useState } from 'react';
import { NotificationsBell } from './NotificationsBell';

export interface NotificationsCenterContainerProps {
  popupView?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const NotificationsBellContainer = ({ popupView }: NotificationsCenterContainerProps): React.ReactElement => {
  // TODO Connect with notifications center
  const [notificationsCount, setNotificationsCount] = useState(0);

  // TODO Connect with notifications center
  const handleClick = () => {
    // eslint-disable-next-line no-magic-numbers
    setNotificationsCount(notificationsCount === 11 ? 0 : notificationsCount + 1);
  };

  return <NotificationsBell notificationsCount={notificationsCount} onClick={handleClick} popupView={popupView} />;
};
