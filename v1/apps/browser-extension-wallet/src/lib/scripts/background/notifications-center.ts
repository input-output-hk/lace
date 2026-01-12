import { runtime, storage } from 'webextension-polyfill';
import { ReplaySubject } from 'rxjs';
import { exposeApi } from '@cardano-sdk/web-extension';

import {
  LaceNotification,
  NotificationsCenterProperties,
  notificationsCenterProperties as properties,
  NotificationsTopic
} from '@src/types/notifications-center';
import { logger } from '@lace/common';
import { NotificationsClient, NotificationsStorage } from '@lace/notifications';
import { getBackgroundStorage } from './storage';
import { ExperimentName } from '../types/feature-flags';

export const STORAGE_KEY = 'redux:persist:notificationsCenter';

const baseChannel = 'notifications-center';

// Store reference to notifications client for dynamic updates
let notificationsClientInstance: NotificationsClient | undefined;

const production = () => {
  throw new Error('Not enabled');
};

const noop = (): Promise<void> => Promise.resolve();

const exposeDisabledNotificationsCenterAPI = (api$: ReplaySubject<NotificationsCenterProperties>) => {
  logger.info('Notifications Center: disabled (no-op API)');

  const notifications$ = new ReplaySubject<LaceNotification[]>(1);
  const topics$ = new ReplaySubject<NotificationsTopic[]>(1);

  api$.next({
    notifications: { markAsRead: noop, notifications$, remove: noop },
    test: { add: production, init: production },
    topics: { topics$, subscribe: noop, unsubscribe: noop }
  });

  notifications$.next([]);
  topics$.next([]);

  return Promise.resolve();
};

const exposeTestNotificationsCenterAPI = (api$: ReplaySubject<NotificationsCenterProperties>) => {
  logger.info('Notifications Center: test API enabled');
  let notifications: LaceNotification[] = [];
  let topics: NotificationsTopic[] = [];

  const notifications$ = new ReplaySubject<LaceNotification[]>(1);
  const topics$ = new ReplaySubject<NotificationsTopic[]>(1);

  const add = async (notification: LaceNotification): Promise<void> => {
    const topic = topics.find((t) => t.id === notification.message.topicId);

    if (topic?.isSubscribed) {
      notifications.unshift(notification);
      notifications$.next(notifications);
    }

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
    for (const topic of topics) if (topic.id === topicId) topic.isSubscribed = true;

    topics$.next(topics);

    return Promise.resolve();
  };

  const unsubscribe = async (topicId: NotificationsTopic['id']): Promise<void> => {
    for (const topic of topics) if (topic.id === topicId) delete topic.isSubscribed;

    topics$.next(topics);

    return Promise.resolve();
  };

  const expose = (test: NotificationsCenterProperties['test']) => {
    api$.next({
      notifications: { markAsRead, notifications$, remove },
      test,
      topics: { topics$, subscribe, unsubscribe }
    });

    notifications$.next(notifications);
    topics$.next(topics);
  };

  const init = async (data: { notifications: LaceNotification[]; topics: NotificationsTopic[] }): Promise<void> => {
    ({ notifications, topics } = data);

    expose({ add, init });

    return Promise.resolve();
  };

  expose({
    add: () => {
      throw new Error('Call init in order to call add');
    },
    init
  });

  return Promise.resolve();
};

const exposeProductionNotificationsCenterAPI = async (api$: ReplaySubject<NotificationsCenterProperties>) => {
  logger.info('Notifications Center: production API enabled');

  const { local: localStorage } = storage;
  let { notifications, topics } = {
    notifications: [],
    topics: [],
    ...(
      await (localStorage.get(STORAGE_KEY) as Promise<{
        [STORAGE_KEY]: { notifications: LaceNotification[]; topics: NotificationsTopic[] };
      }>)
    )[STORAGE_KEY]
  };

  const save = () =>
    localStorage.set({ [STORAGE_KEY]: { notifications, topics, _persist: '{"version":1,"rehydrated":true}' } });

  const notifications$ = new ReplaySubject<LaceNotification[]>(1);
  const topics$ = new ReplaySubject<NotificationsTopic[]>(1);

  const notificationsStorage: NotificationsStorage = {
    getItem: async (key) => (await localStorage.get(key))[key],
    removeItem: (key) => localStorage.remove(key),
    setItem: (key, value) => localStorage.set({ [key]: value })
  };

  // Read feature flag payload to get fetchMissedMessagesIntervalMinutes
  const backgroundStorage = await getBackgroundStorage();
  const featureFlagPayload = backgroundStorage?.featureFlagPayloads?.[ExperimentName.NOTIFICATIONS_CENTER];
  const fetchMissedMessagesIntervalMinutes =
    featureFlagPayload &&
    typeof featureFlagPayload === 'object' &&
    'fetchMissedMessagesIntervalMinutes' in featureFlagPayload
      ? (featureFlagPayload.fetchMissedMessagesIntervalMinutes as number)
      : undefined;

  const notificationsClient = new NotificationsClient({
    provider: {
      name: 'PubNub',
      configuration: {
        skipAuthentication: process.env.PUBNUB_SKIP_AUTHENTICATION === 'true',
        subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY,
        ...(process.env.PUBNUB_TOKEN_ENDPOINT && { tokenEndpoint: process.env.PUBNUB_TOKEN_ENDPOINT }),
        ...(fetchMissedMessagesIntervalMinutes !== undefined && { fetchMissedMessagesIntervalMinutes })
      }
    },
    storage: notificationsStorage,
    onNotification: (message) => {
      if (notifications.some((notification) => notification.message.id === message.id)) return;
      notifications.unshift({ message });
      notifications$.next(notifications);
      save().catch((error) => logger.error('Failed to save notifications', error));
    },
    onTopics: (newTopics) => {
      topics$.next((topics = newTopics));
      save().catch((error) => logger.error('Failed to save topics', error));
    }
  });

  // Store reference for dynamic updates
  notificationsClientInstance = notificationsClient;

  const markAsRead = (id?: LaceNotification['message']['id']) => {
    for (const notification of notifications) if (notification.message.id === id || !id) notification.read = true;

    notifications$.next(notifications);
    return save();
  };

  const remove = (id: LaceNotification['message']['id']) => {
    notifications = notifications.filter((notification) => notification.message.id !== id);

    notifications$.next(notifications);
    return save();
  };

  const subscribe = (topicId: NotificationsTopic['id']) => notificationsClient.subscribe(topicId);
  const unsubscribe = (topicId: NotificationsTopic['id']) => notificationsClient.unsubscribe(topicId);

  api$.next({
    notifications: { markAsRead, notifications$, remove },
    test: { add: production, init: production },
    topics: { topics$, subscribe, unsubscribe }
  });

  notifications$.next(notifications);
  topics$.next(topics);
};

const exposeNotificationsCenterAPI = () => {
  const api$ = new ReplaySubject<NotificationsCenterProperties>(1);

  exposeApi<NotificationsCenterProperties>({ api$, baseChannel, properties }, { logger, runtime });

  const mode = process.env.NOTIFICATION_CENTER_MODE || 'production';

  switch (mode) {
    case 'test':
      return exposeTestNotificationsCenterAPI(api$);
    case 'production':
      return exposeProductionNotificationsCenterAPI(api$);
    case 'noop':
    default:
      return exposeDisabledNotificationsCenterAPI(api$);
  }
};

// if (!(globalThis as unknown as { LMP_BUNDLE: boolean }).LMP_BUNDLE) exposeNotificationsCenterAPI();

exposeNotificationsCenterAPI().catch((error) => {
  logger.error('Failed to expose notifications center API', error);
});

/**
 * Gets the current notifications client instance.
 * Used for dynamic updates when feature flags change.
 *
 * @returns The notifications client instance, or undefined if not initialized
 */
export const getNotificationsClient = (): NotificationsClient | undefined => notificationsClientInstance;
