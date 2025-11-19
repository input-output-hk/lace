import { useMemo } from 'react';
import { runtime } from 'webextension-polyfill';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { consumeRemoteApi } from '@cardano-sdk/web-extension';
import { logger, useObservable } from '@lace/common';
import {
  LaceNotificationWithTopicName,
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

(globalThis as Record<string, unknown>).notificationsCenterApi = notificationsCenterApi;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useNotificationsCenter = () => {
  const { markAsRead, notifications$, remove } = notificationsCenterApi.notifications;
  const { topics$, subscribe, unsubscribe } = notificationsCenterApi.topics;

  const notificationsWithTopics$ = useMemo(
    () =>
      combineLatest([notifications$, topics$]).pipe(
        map(([notifications, topics]) =>
          notifications.map(
            ({ message, ...rest }): LaceNotificationWithTopicName => ({
              ...rest,
              message,
              topicName: topics.find(({ id }) => id === message.topicId)?.name || message.topicId
            })
          )
        )
      ),
    [notifications$, topics$]
  );

  const notifications = useObservable<LaceNotificationWithTopicName[]>(notificationsWithTopics$);
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
