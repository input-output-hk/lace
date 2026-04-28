import { Observable, Subject, of, merge, forkJoin, EMPTY } from 'rxjs';
import { switchMap, map, filter, take, exhaustMap, concatMap, catchError, shareReplay } from 'rxjs/operators';
import { StoredTopic, Topic, StorageAdapter, NotificationsLogger, CachedTopics } from '../types';
import { toPubNubTimetoken } from '../utils';
import { StorageKeys } from '../StorageKeys';
import { PubNubRxWrapper } from './PubNubRxWrapper';
import { TopicCommand } from './topicReducer';
import { createTopicState$ } from './createTopicState';
import { persistTopics } from './persistTopics';
import { withNetworkRetry } from './withNetworkRetry';

// --- Helpers ---

/**
 * RxJS operator that migrates legacy subscribedTopics to isSubscribed field.
 * Reads the legacy key, marks matching topics as subscribed, saves, removes legacy key.
 */
const migrateLegacy =
  (
    storage: StorageAdapter,
    storageKeys: StorageKeys,
    logger: NotificationsLogger
  ): ((source$: Observable<CachedTopics | undefined>) => Observable<CachedTopics | undefined>) =>
  (source$) =>
    source$.pipe(
      switchMap((cached) => {
        if (!cached) return of(cached);

        return storage.getItem<string[]>(storageKeys.getSubscribedTopics()).pipe(
          switchMap((legacy) => {
            if (!legacy || legacy.length === 0) return of(cached);

            logger.info(`Migrating ${legacy.length} legacy subscribed topics`);
            const legacySet = new Set(legacy);
            const migrated: CachedTopics = {
              ...cached,
              topics: cached.topics.map((t) => (legacySet.has(t.id) ? { ...t, isSubscribed: true } : t))
            };

            return storage.setItem(storageKeys.getTopics(), migrated).pipe(
              concatMap(() => storage.removeItem(storageKeys.getSubscribedTopics())),
              map(() => migrated)
            );
          }),
          catchError((error) => {
            logger.warn('Failed to migrate legacy subscribedTopics:', error);
            return of(cached);
          })
        );
      })
    );

/**
 * Initializes lastSync for topics that don't already have one.
 * Skips topics that already have a stored lastSync (idempotent).
 */
const initializeLastSync = (
  topics: Topic[],
  storage: StorageAdapter,
  storageKeys: StorageKeys,
  logger: NotificationsLogger,
  now: () => number
): Observable<void> => {
  if (topics.length === 0) return of(void 0);

  const nowTimetoken = toPubNubTimetoken(now());

  return forkJoin(
    topics.map((topic) =>
      storage.getItem<string>(storageKeys.getLastSync(topic.id)).pipe(
        switchMap((existing) =>
          existing ? of(void 0) : storage.setItem(storageKeys.getLastSync(topic.id), nowTimetoken)
        ),
        catchError((error) => {
          logger.warn(`Failed to initialize lastSync for ${topic.id}:`, error);
          return of(void 0);
        })
      )
    )
  ).pipe(map(() => void 0));
};

/**
 * Creates the topics pipeline — the single source of truth for topic state.
 *
 * Wires together:
 * - Storage load (+ legacy migration) → 'loaded' command
 * - PubNub fetch on topicSync$ signals → 'fetched' command (with exhaustMap)
 * - Imperative subscribe/unsubscribe → commands$ Subject
 * - State management via createTopicState$ (scan reducer)
 * - Persistence via persistTopics operator
 *
 * @returns topics$ (shared, replayed) and commands$ (imperative boundary)
 */
export const createTopics$ = (config: {
  topicSync$: Observable<void>;
  storage: StorageAdapter;
  storageKeys: StorageKeys;
  wrapper: PubNubRxWrapper;
  logger: NotificationsLogger;
  now?: () => number;
}): {
  topics$: Observable<StoredTopic[]>;
  commands$: Subject<TopicCommand>;
} => {
  const { topicSync$, storage, storageKeys, wrapper, logger, now = Date.now } = config;
  const commands$ = new Subject<TopicCommand>();

  // Step 1: Load from storage, migrate legacy, map to 'loaded' command
  const loaded$: Observable<TopicCommand> = storage.getItem<CachedTopics>(storageKeys.getTopics()).pipe(
    migrateLegacy(storage, storageKeys, logger),
    map((cached): TopicCommand => ({ type: 'loaded', topics: cached?.topics ?? [] })),
    catchError((error) => {
      logger.warn('Failed to load stored topics:', error);
      return of<TopicCommand>({ type: 'loaded', topics: [] });
    }),
    shareReplay(1)
  );

  // Step 2: If storage was empty, trigger an initial fetch
  const initialFetchIfEmpty$ = loaded$.pipe(
    filter((cmd) => cmd.type === 'loaded' && cmd.topics.length === 0),
    map(() => void 0),
    take(1)
  );

  // Step 3: Fetch topics on sync events (initial + external), initialize lastSync
  const fetched$: Observable<TopicCommand> = merge(initialFetchIfEmpty$, topicSync$).pipe(
    exhaustMap(() =>
      wrapper.fetchTopics().pipe(
        withNetworkRetry(),
        concatMap((topics) => {
          const autoSubscribed = topics.filter((t) => t.autoSubscribe);
          return initializeLastSync(autoSubscribed, storage, storageKeys, logger, now).pipe(
            map((): TopicCommand => ({ type: 'fetched', topics }))
          );
        }),
        catchError((error) => {
          logger.error('Failed to fetch topics after all retries:', error);
          return EMPTY;
        })
      )
    )
  );

  // Step 4: Wire state pipeline → persist → share
  const topics$ = createTopicState$({ loaded$, fetched$, commands$ }).pipe(
    persistTopics(storage, storageKeys, logger, now),
    shareReplay(1)
  );

  return { topics$, commands$ };
};
