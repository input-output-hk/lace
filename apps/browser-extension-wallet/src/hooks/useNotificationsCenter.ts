import { useMemo } from 'react';
import { runtime } from 'webextension-polyfill';

import { consumeRemoteApi } from '@cardano-sdk/web-extension';
import { logger, useObservable } from '@lace/common';
import {
  LaceNotification,
  notificationsCenterProperties,
  NotificationsCenterProperties,
  NotificationsTopic
} from '@src/types/notifications-center';

const notificationsCenterApi = consumeRemoteApi<NotificationsCenterProperties>(
  {
    baseChannel: 'notifications-center',
    properties: notificationsCenterProperties
  },
  { logger, runtime }
);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useNotificationsCenter = () => {
  const { markAsRead, notifications$, remove } = notificationsCenterApi.notifications;
  const { topics$, subscribe, unsubscribe } = notificationsCenterApi.topics;

  const notifications = useObservable<LaceNotification[]>(notifications$);
  const topics = useObservable<NotificationsTopic[]>(topics$);

  const unreadNotifications = useMemo(
    () => notifications?.reduce((unreadCounter, { read }) => unreadCounter + (read ? 0 : 1), 0) ?? 0,
    [notifications]
  );

  return {
    notifications,
    unreadNotifications,
    topics,
    subscribe,
    unsubscribe,
    markAsRead,
    remove
  };
};
