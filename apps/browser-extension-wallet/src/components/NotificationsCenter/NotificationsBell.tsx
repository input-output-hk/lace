import React from 'react';

import { Button } from '@lace/common';

import styles from './NotificationsBell.module.scss';

import NotificationBellIcon from '@lace/core/src/ui/assets/icons/notifications-bell.component.svg';

// eslint-disable-next-line no-magic-numbers
const formatNotificationCount = (count: number) => (count < 10 ? count.toString() : '9+');

export interface NotificationsBellProps {
  onClick: () => void;
  unreadNotifications: number;
}

export const NotificationsBell = ({ onClick, unreadNotifications }: NotificationsBellProps): React.ReactElement => (
  <Button className={styles.btn} block color="gradient" data-testid="notifications-bell" onClick={onClick}>
    <NotificationBellIcon />
    {unreadNotifications > 0 && <span className={styles.badge}>{formatNotificationCount(unreadNotifications)}</span>}
  </Button>
);
