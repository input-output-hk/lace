import { Observable, EMPTY, from, of } from 'rxjs';
import { withLatestFrom, exhaustMap, mergeMap, catchError, share } from 'rxjs/operators';
import { Notification, StoredTopic, StorageAdapter, NotificationsLogger } from '../types';
import { NotificationsAuthProvider } from '../provider.interface';
import { StorageKeys } from '../StorageKeys';
import { PubNubRxWrapper } from './PubNubRxWrapper';
import { withAuthRetry } from './withAuthRetry';
import { syncTopicNotifications } from './syncTopicNotifications';
import { isAuthError } from '../errors';

const TOPIC_SYNC_CONCURRENCY = 5;

/**
 * Creates the notifications pipeline — emits individual Notification events.
 *
 * On each notificationSync$ signal:
 * 1. Reads subscribed topics from topics$ (withLatestFrom)
 * 2. Wraps the entire batch with withAuthRetry (one token for all topics)
 * 3. Fan-out: syncTopicNotifications per subscribed topic (mergeMap, concurrency=5)
 * 4. Per-topic non-auth errors are caught and skipped
 * 5. Auth errors propagate to withAuthRetry for token refresh + single retry
 * 6. Flattens Notification[] → individual Notification emissions
 *
 * Uses exhaustMap (drops sync signals while processing) and share() (events, not state).
 */
export const createNotifications$ = (config: {
  notificationSync$: Observable<string>;
  topics$: Observable<StoredTopic[]>;
  authProvider: NotificationsAuthProvider;
  wrapper: PubNubRxWrapper;
  storage: StorageAdapter;
  storageKeys: StorageKeys;
  logger: NotificationsLogger;
}): Observable<Notification> => {
  const { notificationSync$, topics$, authProvider, wrapper, storage, storageKeys, logger } = config;

  return notificationSync$.pipe(
    withLatestFrom(topics$),
    exhaustMap(([incomingTimestamp, topics]) => {
      const subscribed = topics.filter((t) => t.isSubscribed);
      if (subscribed.length === 0) return EMPTY;

      return withAuthRetry(
        authProvider,
        wrapper,
        () =>
          from(subscribed).pipe(
            mergeMap(
              (topic) =>
                syncTopicNotifications(topic.id, incomingTimestamp, { wrapper, storage, storageKeys, logger }).pipe(
                  catchError((error) => {
                    if (isAuthError(error)) throw error;
                    logger.warn(`Failed to sync topic ${topic.id}:`, error);
                    return of([] as Notification[]);
                  })
                ),
              TOPIC_SYNC_CONCURRENCY
            ),
            mergeMap((notifications) => from(notifications))
          ),
        logger
      );
    }),
    share()
  );
};
