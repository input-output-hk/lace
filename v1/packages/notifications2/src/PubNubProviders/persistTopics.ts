import { Observable, OperatorFunction, of } from 'rxjs';
import { catchError, concatMap, map } from 'rxjs/operators';
import { CachedTopics, NotificationsLogger, StorageAdapter, StoredTopic } from '../types';
import { StorageKeys } from '../StorageKeys';

/**
 * RxJS operator that persists each StoredTopic[] emission to storage.
 *
 * - Uses concatMap to wait for each write to complete before passing through
 * - On storage failure: logs warning and passes through anyway (in-memory state is authoritative)
 * - Wraps topics in CachedTopics format with lastFetch timestamp
 *
 * @param storage - Storage adapter for persistence
 * @param storageKeys - Storage key manager
 * @param logger - Logger for warning on failures
 * @param now - Optional clock function for testability (defaults to Date.now)
 * @returns RxJS operator that persists and passes through StoredTopic[]
 */
export const persistTopics =
  (
    storage: StorageAdapter,
    storageKeys: StorageKeys,
    logger: NotificationsLogger,
    now: () => number = Date.now
  ): OperatorFunction<StoredTopic[], StoredTopic[]> =>
  (source$: Observable<StoredTopic[]>) =>
    source$.pipe(
      concatMap((topics) => {
        const cached: CachedTopics = { lastFetch: now(), topics };
        return storage.setItem(storageKeys.getTopics(), cached).pipe(
          map(() => topics),
          catchError((error) => {
            logger.warn('Failed to persist topics:', error);
            return of(topics);
          })
        );
      })
    );
