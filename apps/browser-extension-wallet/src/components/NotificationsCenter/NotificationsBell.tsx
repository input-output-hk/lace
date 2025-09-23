import React from 'react';
import { Button } from '@lace/common';
import styles from './NotificationsCenter.module.scss';
import NotificationBellIcon from '../../assets/icons/notifications-bell.component.svg';

// eslint-disable-next-line no-magic-numbers
const formatNotificationCount = (count: number) => (count < 10 ? count.toString() : '9+');

export interface NotificationsBellProps {
  notificationsCount: number;
  onClick: () => void;
  popupView?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const NotificationsBell = ({ notificationsCount, onClick }: NotificationsBellProps): React.ReactElement => (
  <Button className={styles.btn} block onClick={onClick} color="gradient" data-testid="notifications-bell">
    <NotificationBellIcon />
    {notificationsCount > 0 && <span className={styles.badge}>{formatNotificationCount(notificationsCount)}</span>}
  </Button>
);
