import { runtime, storage } from 'webextension-polyfill';
import {
  ReplaySubject,
  Subject,
  from,
  map,
  scan,
  tap,
  shareReplay,
  firstValueFrom,
  Observable,
  merge,
  interval,
  filter,
  switchMap,
  startWith
} from 'rxjs';
import { exposeApi } from '@cardano-sdk/web-extension';
import { v4, validate } from 'uuid';

import {
  LaceNotification,
  LaceMessage,
  NotificationsCenterProperties,
  notificationsCenterProperties as properties,
  NotificationsTopic
} from '../../../types/notifications-center';
import { logger } from '@lace/common';
import {
  createPubNubWrapper,
  PubNubAuthProvider,
  PubNubPollingProvider,
  toPubNubTimetoken,
  StorageAdapter,
  StorageKeys
} from '@lace/notifications2';

export const STORAGE_KEY = 'redux:persist:notificationsCenter';
const PERSIST_VERSION = '{"version":1,"rehydrated":true}';
const TOPIC_SYNC_INTERVAL_HOURS = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const TOPIC_SYNC_INTERVAL = TOPIC_SYNC_INTERVAL_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
const TOPICS_STORAGE_KEY = 'notifications:topics';

const baseChannel = 'notifications-center';

// Export API promise for same-context usage (within background script)
let notificationsCenterApiResolver: (api: NotificationsCenterProperties) => void;
export const notificationsCenterApi = new Promise<NotificationsCenterProperties>((resolve) => {
  notificationsCenterApiResolver = resolve;
});

const production = () => {
  throw new Error('Not enabled');
};

const noop = (): Promise<void> => Promise.resolve();

const exposeDisabledNotificationsCenterAPI = (api$: ReplaySubject<NotificationsCenterProperties>) => {
  logger.info('Notifications Center: disabled (no-op API)');

  const notifications$ = new ReplaySubject<LaceNotification[]>(1);
  const topics$ = new ReplaySubject<NotificationsTopic[]>(1);

  const apiObject = {
    notifications: { markAsRead: noop, notifications$, remove: noop, triggerNotificationSync: noop },
    test: { add: production, init: production },
    topics: { topics$, subscribe: noop, unsubscribe: noop }
  };

  api$.next(apiObject);
  notificationsCenterApiResolver(apiObject);

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

  const triggerNotificationSync = async (): Promise<void> => Promise.resolve();

  const expose = (test: NotificationsCenterProperties['test']) => {
    const apiObject = {
      notifications: { markAsRead, notifications$, remove, triggerNotificationSync },
      test,
      topics: { topics$, subscribe, unsubscribe }
    };

    api$.next(apiObject);
    notificationsCenterApiResolver(apiObject);

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

/**
 * Gets or creates a user ID from storage.
 */
const getUserId = async (localStorage: typeof storage.local): Promise<string> => {
  const userIdKey = 'notifications:userId';
  let userId = (await localStorage.get(userIdKey))[userIdKey] as string | undefined;

  if (!userId) {
    userId = v4();
    await localStorage.set({ [userIdKey]: userId });
    logger.info('Generated new userId for notifications');
  } else if (!validate(userId)) {
    throw new Error(`Stored userId is not a valid UUID: ${userId}`);
  }

  logger.debug(`Using userId for notifications: ${userId}`);
  return userId;
};

/**
 * Checks if topics should be synced based on last fetch timestamp from library storage.
 * Uses the lastFetch field from notifications:topics that the library maintains automatically.
 * Note: Initial fetch when storage is empty is handled by the library automatically.
 * This function only triggers periodic refreshes (24h interval).
 */
const shouldSyncTopics = async (localStorage: typeof storage.local): Promise<boolean> => {
  const result = await localStorage.get(TOPICS_STORAGE_KEY);
  const cachedTopics = result[TOPICS_STORAGE_KEY] as { lastFetch?: number; topics: unknown[] } | undefined;

  // Library handles initial fetch when storage is empty, so we only check elapsed time
  if (!cachedTopics?.lastFetch) return false;

  // Check if enough time has elapsed since last fetch (24 hours)
  const elapsed = Date.now() - cachedTopics.lastFetch;
  return elapsed >= TOPIC_SYNC_INTERVAL;
};

/**
 * Storage adapter that converts webextension-polyfill storage API (Promise-based)
 * to Observable-based API required by notifications2 package.
 * Note: implements clause removed due to RxJS version mismatch between workspace and notifications2.
 * The shape is compatible but TypeScript sees different Observable types.
 */
class WebExtensionStorageAdapter implements StorageAdapter {
  constructor(private storageApi: typeof storage.local) {}

  getItem<T>(key: string): Observable<T | undefined> {
    return from(this.storageApi.get(key)).pipe(map((result): T | undefined => result[key]));
  }

  setItem<T>(key: string, value: T): Observable<void> {
    return from(this.storageApi.set({ [key]: value })).pipe(map((): void => void 0));
  }

  removeItem(key: string): Observable<void> {
    return from(this.storageApi.remove(key)).pipe(map((): void => void 0));
  }
}
/**
 * Creates and initializes the PubNub polling provider.
 */
const createProvider = (
  userId: string,
  notificationSync$: Observable<string>,
  topicSync$: Observable<void>,
  localStorage: typeof storage.local
): PubNubPollingProvider => {
  const storageAdapter = new WebExtensionStorageAdapter(localStorage);
  const storageKeys = new StorageKeys('notifications');

  const pubNubWrapper = createPubNubWrapper({
    subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY || '',
    userId,
    logger
  });

  let authProvider;
  if (process.env.PUBNUB_SKIP_AUTHENTICATION !== 'true' && process.env.PUBNUB_TOKEN_ENDPOINT) {
    authProvider = new PubNubAuthProvider({
      userId,
      tokenEndpoint: process.env.PUBNUB_TOKEN_ENDPOINT,
      storage: storageAdapter,
      storageKeys
    });
  }

  return new PubNubPollingProvider({
    authProvider,
    notificationSync$,
    topicSync$,
    storage: storageAdapter,
    storageKeys,
    logger,
    wrapper: pubNubWrapper
  });
};

/**
 * Command types for notification updates.
 */
type NotificationCommand =
  | { type: 'add'; payload: LaceMessage }
  | { type: 'markAsRead'; payload?: LaceMessage['id'] }
  | { type: 'remove'; payload: LaceMessage['id'] }
  | { type: 'init' };

/**
 * Creates the notifications observable stream using command pattern.
 */
const createNotificationsStream = (
  provider: PubNubPollingProvider,
  initialNotifications: LaceNotification[],
  markAsReadCommand$: Subject<LaceMessage['id'] | undefined>,
  removeCommand$: Subject<LaceMessage['id']>,
  localStorage: typeof storage.local
): Observable<LaceNotification[]> => {
  // Convert provider notifications to add commands
  const addFromProvider$ = provider.notifications$.pipe(
    map((notification): NotificationCommand => ({ type: 'add', payload: notification }))
  );

  // Convert command subjects to commands
  const markAsReadCommands$ = markAsReadCommand$.pipe(
    map((id): NotificationCommand => ({ type: 'markAsRead', payload: id }))
  );

  const removeCommands$ = removeCommand$.pipe(map((id): NotificationCommand => ({ type: 'remove', payload: id })));

  // Merge all command streams and reduce to notification array
  // startWith 'init' to emit initialNotifications immediately on subscription
  return merge(addFromProvider$, markAsReadCommands$, removeCommands$).pipe(
    startWith<NotificationCommand>({ type: 'init' }),
    scan((notifications, command): LaceNotification[] => {
      switch (command.type) {
        case 'init':
          // First emission - return initial notifications unchanged
          return notifications;

        case 'add':
          // Don't add duplicates
          if (notifications.some((n) => n.message.id === command.payload.id)) return notifications;
          return [{ message: command.payload }, ...notifications];

        case 'markAsRead':
          return notifications.map((n) =>
            n.message.id === command.payload || !command.payload ? { ...n, read: true } : n
          );

        case 'remove':
          return notifications.filter((n) => n.message.id !== command.payload);

        default:
          return notifications;
      }
    }, initialNotifications),
    tap((notifications) =>
      localStorage
        .set({ [STORAGE_KEY]: { notifications, _persist: PERSIST_VERSION } })
        .catch((error) => logger.error('Failed to save notifications', error))
    ),
    shareReplay(1)
  );
};

/**
 * Creates API methods for notifications center.
 */
const createApiMethods = (
  provider: PubNubPollingProvider,
  notificationSync$: Subject<string>,
  markAsReadCommand$: Subject<LaceMessage['id'] | undefined>,
  removeCommand$: Subject<LaceMessage['id']>
) => {
  const markAsRead = (id?: LaceMessage['id']) => {
    markAsReadCommand$.next(id);
    return Promise.resolve();
  };

  const remove = (id: LaceMessage['id']) => {
    removeCommand$.next(id);
    return Promise.resolve();
  };

  const subscribe = (topicId: NotificationsTopic['id']): Promise<void> => firstValueFrom(provider.subscribe(topicId));

  const unsubscribe = (topicId: NotificationsTopic['id']): Promise<void> =>
    firstValueFrom(provider.unsubscribe(topicId));

  /** timestamp is expected to be in iso format (YYYY-MM-DDTHH:MM:SS.SSSZ) */
  const triggerNotificationSync = (timestamp: string): Promise<void> => {
    notificationSync$.next(timestamp);
    return Promise.resolve();
  };

  return { markAsRead, remove, subscribe, unsubscribe, triggerNotificationSync };
};

const exposeProductionNotificationsCenterAPI = async (api$: ReplaySubject<NotificationsCenterProperties>) => {
  logger.info('Notifications Center: production API enabled');

  const { local: localStorage } = storage;

  // 1. Load existing data from storage
  const storageData = (
    await (localStorage.get(STORAGE_KEY) as Promise<{
      [STORAGE_KEY]: { notifications: LaceNotification[] };
    }>)
  )[STORAGE_KEY];

  const initialNotifications: LaceNotification[] = storageData?.notifications || [];

  // 2. Get or create userId
  const userId = await getUserId(localStorage);

  // 3. Create sync trigger subjects and provider
  const notificationSyncSubject = new Subject<string>();

  // Create an interval that checks every hour if topics should be synced (24h elapsed)
  // Library handles initial fetch when storage is empty automatically
  const SYNC_CHECK_INTERVAL_MS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
  const periodicTopicSync$ = interval(SYNC_CHECK_INTERVAL_MS).pipe(
    switchMap(() => from(shouldSyncTopics(localStorage))),
    filter((shouldSync) => shouldSync),
    map((): void => void 0)
  );

  const topicSync$ = periodicTopicSync$;

  const provider = createProvider(
    userId,
    // Convert ISO timestamp string to PubNub timetoken (milliseconds * 10_000)
    notificationSyncSubject.asObservable().pipe(map((timestamp) => toPubNubTimetoken(Date.parse(timestamp)))),
    topicSync$,
    localStorage
  );

  // 4. Create command subjects for user actions
  const markAsReadCommand$ = new Subject<LaceMessage['id'] | undefined>();
  const removeCommand$ = new Subject<LaceMessage['id']>();

  // 5. Create reactive notifications stream
  const notifications$ = createNotificationsStream(
    provider,
    initialNotifications,
    markAsReadCommand$,
    removeCommand$,
    localStorage
  );

  // 6. Create and expose API methods
  const apiMethods = createApiMethods(provider, notificationSyncSubject, markAsReadCommand$, removeCommand$);
  const { markAsRead, remove, subscribe, unsubscribe, triggerNotificationSync } = apiMethods;

  // 7. Expose API
  const apiObject = {
    notifications: { markAsRead, notifications$, remove, triggerNotificationSync },
    test: { add: production, init: production },
    topics: { topics$: provider.topics$, subscribe, unsubscribe }
  };

  api$.next(apiObject);
  notificationsCenterApiResolver(apiObject);
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
