import { runtime } from 'webextension-polyfill';
import { of, ReplaySubject } from 'rxjs';
import { exposeApi } from '@cardano-sdk/web-extension';

import {
  LaceNotification,
  NotificationsCenterProperties,
  notificationsCenterProperties,
  NotificationsTopic
} from '@src/types/notifications-center';
import { logger } from '@lace/common';

const exposeNotificationsCenterAPI = (): void => {
  let notifications: LaceNotification[] = [
    {
      message: {
        body: 'The Glacier Drop phase 2 is live',
        chain: 'Midnight',
        format: 'plain',
        id: 'id-1',
        publisher: 'Midnight',
        topicId: 'topic-1',
        title: 'The Glacier Drop phase 2 is live'
      }
    },
    {
      message: {
        body: 'The new node version XYZ is out',
        chain: 'Midnight',
        format: 'plain',
        id: 'id-2',
        publisher: 'Midnight',
        topicId: 'topic-2',
        title: 'The new node version XYZ is out'
      }
    },
    {
      message: {
        body: 'The governance council has opened voting for governance action number 26.\nNIGHT holders are welcome to cast their votes until Aug-31 via the portal at\n\nhttps://governance.midnight.network',
        chain: 'Cardano',
        format: 'plain',
        id: 'id-3',
        publisher: 'Governance',
        topicId: 'topic-1',
        title: 'The governance council has opened voting for governance action number 26'
      },
      read: true
    }
  ];

  let topics: NotificationsTopic[] = [
    { id: 'topic-1', name: 'Topic One' },
    { id: 'topic-2', name: 'Topic Two', subscribed: true }
  ];

  const notifications$ = new ReplaySubject<LaceNotification[]>(1);
  const topics$ = new ReplaySubject<NotificationsTopic[]>(1);

  const add = async (notification: LaceNotification): Promise<void> => {
    const topic = topics.find((t) => t.id === notification.message.topicId);

    if (topic?.subscribed) {
      notifications.unshift(notification);
      notifications$.next(notifications);
    }

    return Promise.resolve();
  };

  const init = async (data: { topics: NotificationsTopic[]; notifications: LaceNotification[] }): Promise<void> => {
    ({ notifications, topics } = data);

    notifications$.next(notifications);
    topics$.next(topics);

    return Promise.resolve();
  };

  const markAsRead = async (id?: LaceNotification['message']['id']): Promise<void> => {
    for (const notification of notifications) if (notification.message.id === id || !id) notification.read = true;

    notifications$.next(notifications);

    return Promise.resolve();
  };

  const remove = async (id: LaceNotification['message']['id']): Promise<void> => {
    notifications = notifications.filter((notification) => notification.message.id !== id);

    notifications$.next(notifications);

    return Promise.resolve();
  };

  const subscribe = async (topicId: NotificationsTopic['id']): Promise<void> => {
    for (const topic of topics) if (topic.id === topicId) topic.subscribed = true;

    topics$.next(topics);

    return Promise.resolve();
  };

  const unsubscribe = async (topicId: NotificationsTopic['id']): Promise<void> => {
    for (const topic of topics) if (topic.id === topicId) delete topic.subscribed;

    topics$.next(topics);

    return Promise.resolve();
  };

  exposeApi<NotificationsCenterProperties>(
    {
      api$: of({
        notifications: { markAsRead, notifications$, remove },
        test: { add, init },
        topics: { topics$, subscribe, unsubscribe }
      }),
      baseChannel: 'notifications-center',
      properties: notificationsCenterProperties
    },
    { logger, runtime }
  );

  notifications$.next(notifications);
  topics$.next(topics);
};

if (!(globalThis as unknown as { LMP_BUNDLE: boolean }).LMP_BUNDLE) exposeNotificationsCenterAPI();
