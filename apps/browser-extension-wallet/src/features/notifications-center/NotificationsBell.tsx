import React from 'react';

import { Button } from '@lace/common';

import styles from './NotificationsBell.module.scss';

import NotificationBellIcon from '../../assets/icons/notifications-bell.component.svg';

const MAX_NOTIFICATION_COUNT = 9;
const formatNotificationCount = (count: number) =>
  count <= MAX_NOTIFICATION_COUNT ? count.toString() : `${MAX_NOTIFICATION_COUNT}+`;

export interface NotificationsBellProps {
  onClick: () => void;
  unreadNotifications: number;
}

export const NotificationsBell = ({ onClick, unreadNotifications }: NotificationsBellProps): React.ReactElement => (
  <Button className={styles.btn} block color="gradient" data-testid="notifications-bell" onClick={onClick}>
    <NotificationBellIcon className={styles.icon} />
    {unreadNotifications > 0 && (
      <span className={styles.badge} data-testid="unread-notifications-counter">
        {formatNotificationCount(unreadNotifications)}
      </span>
    )}
  </Button>
);
