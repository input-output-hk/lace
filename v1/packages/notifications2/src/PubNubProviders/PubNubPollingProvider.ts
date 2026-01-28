import type PubNub from 'pubnub';
import {
  BehaviorSubject,
  catchError,
  concat,
  defer,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  from,
  map,
  mergeMap,
  Observable,
  of,
  share,
  shareReplay,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs';
import { retryBackoff } from 'backoff-rxjs';
import { NotificationProvider } from '../provider.interface';
import { Notification, NotificationsLogger, StorageAdapter, StoredTopic, Topic } from '../types';
import { isAuthError, isNetworkError } from '../errors';
import { PubNubPollingConfig } from './types';
import { PubNubRxWrapper } from './PubNubRxWrapper';
import { StorageKeys } from '../StorageKeys';

const RETRY_INITIAL_INTERVAL_MS = 1000;
const RETRY_MAX_ATTEMPTS = 10;
const TOPIC_SYNC_CONCURRENCY = 5;

/**
 * Converts milliseconds to PubNub timetoken format.
 * PubNub timetokens are 17-digit numbers representing tenths of microseconds since Unix epoch.
 *
 * Conversion: milliseconds × 10,000 = tenths of microseconds
 * - Date.now() returns milliseconds (13 digits)
 * - × 1,000 = microseconds
 * - × 10 = tenths of microseconds (17 digits, PubNub format)
 *
 * @param milliseconds - Timestamp in milliseconds (e.g., from Date.now())
 * @returns PubNub timetoken as string (17 digits)
 * @example
 * toPubNubTimetoken(1706472000000) // "17064720000000000"
 */
// eslint-disable-next-line no-magic-numbers
const toPubNubTimetoken = (milliseconds: number): string => (milliseconds * 10_000).toString();

/**
 * Converts PubNub timetoken to milliseconds.
 * Reverse of toPubNubTimetoken - divides by 10,000 to get milliseconds.
 *
 * @param timetoken - PubNub timetoken as string (17 digits)
 * @returns Timestamp in milliseconds
 * @example
 * fromPubNubTimetoken("17064720000000000") // 1706472000000
 */
// eslint-disable-next-line no-magic-numbers
const fromPubNubTimetoken = (timetoken: string): number => Number(timetoken) / 10_000;

/**
 * PubNub polling provider implementation.
 * Owns topic storage, subscription state, and notification delivery.
 *
 * Responsibilities:
 * - Manage topic storage with isSubscribed state
 * - React to notificationSync$ timestamp signals and fetch history for subscribed topics
 * - React to topicSync$ signals and fetch topic metadata
 * - Manage token lifecycle (cache, refresh on auth errors)
 * - Transform PubNub channels to topics, messages to notifications
 * - Emit all notifications on single observable
 * - Retry with exponential backoff (max 10 attempts)
 */
export class PubNubPollingProvider implements NotificationProvider {
  private readonly wrapper: PubNubRxWrapper;
  private readonly logger: NotificationsLogger;

  // State management - internal BehaviorSubject for coordinating topic state
  private readonly topicsState$ = new BehaviorSubject<Map<string, StoredTopic>>(new Map());

  // Storage references
  private readonly storage: StorageAdapter;
  private readonly storageKeys: StorageKeys;

  constructor(private readonly config: PubNubPollingConfig) {
    this.logger = config.logger;
    this.storage = config.storage;
    this.storageKeys = config.storageKeys;
    this.wrapper = config.wrapper;

    // No explicit subscriptions - everything is lazy and reactive
  }

  /**
   * Reactive topics$ observable - cold observable that activates on subscription.
   *
   * Flow:
   * 1. On first subscription: loads topics from storage
   * 2. Listens to topicSync$ events and fetches/merges new topics
   * 3. Emits updated topic list to all subscribers
   * 4. Persists changes to storage as side effect
   * 5. Cleans up when last subscriber unsubscribes (refCount)
   */
  private readonly _topics$: Observable<StoredTopic[]> = defer(() => {
    this.logger.info('topics$ subscribed - initializing');

    // Step 1: Load topics from storage on first subscription
    const initializeState$ = this.storage.getItem<StoredTopic[]>(this.storageKeys.getTopics()).pipe(
      map((topics) => topics ?? []),
      tap((topics) => {
        const topicsMap = new Map(topics.map((t) => [t.id, t]));
        this.topicsState$.next(topicsMap);
        this.logger.info(`Loaded ${topics.length} topics from storage`);
      }),
      catchError((error) => {
        this.logger.warn('Failed to load stored topics:', error);
        this.topicsState$.next(new Map());
        return of([]);
      })
    );

    // Step 2: React to topicSync$ events
    const topicSyncUpdates$ = this.config.topicSync$.pipe(
      exhaustMap(() => this.fetchTopicsWithRetry()),
      tap((fetchedTopics) => {
        this.logger.info(`Fetched ${fetchedTopics.length} topics from PubNub`);
        this.updateTopicState((currentMap) => {
          const newMap = new Map(currentMap);
          fetchedTopics.forEach((fetched) => {
            const existing = currentMap.get(fetched.id);
            newMap.set(fetched.id, this.mergeTopicMetadata(existing, fetched));
          });
          return newMap;
        });
      }),
      catchError((error) => {
        this.logger.error('Failed to fetch topics after all retries:', error);
        return EMPTY;
      })
    );

    // Step 3: Combine initialization + updates, emit state changes
    return concat(initializeState$, topicSyncUpdates$).pipe(
      switchMap(() => this.topicsState$),
      map((topicsMap) => [...topicsMap.values()]),
      distinctUntilChanged((a, b) => this.areTopicsEqual(a, b)),
      // Side effect: persist to storage
      tap((topics) => {
        this.storage
          .setItem(this.storageKeys.getTopics(), topics)
          .pipe(
            catchError((error) => {
              this.logger.warn('Failed to persist topics:', error);
              return EMPTY;
            })
          )
          .subscribe(() => {
            this.logger.info('Topics persisted successfully');
          });
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  });

  get topics$(): Observable<StoredTopic[]> {
    return this._topics$;
  }

  /**
   * Reactive notifications$ observable - cold observable that activates on subscription.
   *
   * Flow:
   * 1. On subscription: starts listening to notificationSync$ events
   * 2. When notificationSync$ emits: fetches history for all subscribed topics
   * 3. Emits individual notifications to subscribers
   * 4. Only active while there are subscribers (share operator)
   */
  private readonly _notifications$: Observable<Notification> = defer(() => {
    this.logger.info('notifications$ subscribed - starting notification sync');

    return this.config.notificationSync$.pipe(
      withLatestFrom(this._topics$),
      exhaustMap(([incomingTimestamp, topics]) => {
        this.logger.info(`Notification sync triggered with timestamp: ${incomingTimestamp}`);

        const subscribedTopics = topics.filter((t) => t.isSubscribed);

        if (subscribedTopics.length === 0) {
          this.logger.info('No subscribed topics, skipping sync');
          return EMPTY;
        }

        this.logger.info(`Syncing ${subscribedTopics.length} subscribed topics`);

        // Sync all subscribed topics and flatten notifications
        return from(subscribedTopics).pipe(
          mergeMap(
            (topic) =>
              this.syncTopicIfNeeded(topic, incomingTimestamp).pipe(
                catchError((error) => {
                  this.logger.error(`Failed to sync topic ${topic.id}:`, error);
                  return of([]); // Continue with other topics
                })
              ),
            TOPIC_SYNC_CONCURRENCY
          ),
          // Flatten array of notifications to individual emissions
          mergeMap((notifications) => from(notifications))
        );
      }),
      share()
    );
  });

  get notifications$(): Observable<Notification> {
    return this._notifications$;
  }

  /**
   * Helper: Compares two topic arrays for equality.
   * Only compares properties that matter for change detection.
   */
  private areTopicsEqual(a: StoredTopic[], b: StoredTopic[]): boolean {
    if (a.length !== b.length) return false;
    return a.every(
      (topic, i) => topic.id === b[i].id && topic.isSubscribed === b[i].isSubscribed && topic.lastSync === b[i].lastSync
    );
  }

  /**
   * Helper: Updates the internal topic state using a functional updater.
   * Ensures immutable updates to the BehaviorSubject.
   */
  private updateTopicState(updater: (map: Map<string, StoredTopic>) => Map<string, StoredTopic>): void {
    const currentMap = this.topicsState$.value;
    const newMap = updater(currentMap);
    this.topicsState$.next(newMap);
  }

  /**
   * Helper: Merges fetched topic metadata with existing stored topic.
   * Preserves isSubscribed and lastSync from existing topic.
   */
  private mergeTopicMetadata(existing: StoredTopic | undefined, fetched: Topic): StoredTopic {
    if (existing) {
      // Preserve subscription state and lastSync
      return {
        ...fetched,
        isSubscribed: existing.isSubscribed,
        lastSync: existing.lastSync
      };
    }

    // New topic - use autoSubscribe to determine initial state
    const nowTimetoken = toPubNubTimetoken(Date.now());
    return {
      ...fetched,
      isSubscribed: fetched.autoSubscribe,
      lastSync: fetched.autoSubscribe ? nowTimetoken : undefined
    };
  }

  /**
   * Subscribes to a topic by setting isSubscribed=true.
   * Initializes lastSync to Date.now() to fetch messages from now onwards.
   * Persists changes to storage.
   */
  subscribe(topicId: string): Observable<void> {
    this.logger.info(`Subscribing to topic: ${topicId}`);

    const nowTimetoken = toPubNubTimetoken(Date.now());

    this.updateTopicState((currentMap) => {
      const newMap = new Map(currentMap);
      const existingTopic = currentMap.get(topicId);

      if (existingTopic) {
        // Topic exists, update isSubscribed and lastSync
        newMap.set(topicId, {
          ...existingTopic,
          isSubscribed: true,
          lastSync: nowTimetoken
        });
      } else {
        // New topic not in map yet - create minimal StoredTopic
        const newTopic: StoredTopic = {
          id: topicId,
          isSubscribed: true,
          autoSubscribe: false,
          chain: '',
          name: topicId,
          publisher: topicId,
          lastSync: nowTimetoken
        };
        newMap.set(topicId, newTopic);
      }

      return newMap;
    });

    // Persist and log
    const topics = [...this.topicsState$.value.values()];
    return this.storage.setItem(this.storageKeys.getTopics(), topics).pipe(
      tap(() => {
        this.logger.info(`Successfully subscribed to topic: ${topicId} (lastSync=${nowTimetoken})`);
      }),
      catchError((error) => {
        this.logger.error(`Failed to subscribe to topic ${topicId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Unsubscribes from a topic by setting isSubscribed=false.
   * Clears lastSync timestamp.
   * Persists changes to storage.
   */
  unsubscribe(topicId: string): Observable<void> {
    this.logger.info(`Unsubscribing from topic: ${topicId}`);

    const topic = this.topicsState$.value.get(topicId);

    if (!topic) {
      this.logger.warn(`Cannot unsubscribe from unknown topic: ${topicId}`);
      return of(void 0);
    }

    this.updateTopicState((currentMap) => {
      const newMap = new Map(currentMap);
      const existingTopic = currentMap.get(topicId);

      if (existingTopic) {
        newMap.set(topicId, {
          ...existingTopic,
          isSubscribed: false,
          lastSync: undefined
        });
      }

      return newMap;
    });

    // Persist and log
    const topics = [...this.topicsState$.value.values()];
    return this.storage.setItem(this.storageKeys.getTopics(), topics).pipe(
      tap(() => {
        this.logger.info(`Successfully unsubscribed from topic: ${topicId}`);
      }),
      catchError((error) => {
        this.logger.error(`Failed to unsubscribe from topic ${topicId}:`, error);
        // Continue even if storage fails
        return of(void 0);
      })
    );
  }

  /**
   * Closes the provider and releases resources.
   */
  close(): void {
    this.wrapper.stop();
    this.topicsState$.complete();
  }

  /**
   * Syncs a single topic by comparing timestamps.
   * Only fetches if incoming timestamp > lastSync.
   * Always syncs up to current time (Date.now()).
   * Returns notifications fetched for this topic.
   */
  private syncTopicIfNeeded(topic: StoredTopic, incomingTimestamp: string): Observable<Notification[]> {
    // Subscribed topics must have lastSync - if missing, this is an error state
    if (!topic.lastSync) {
      this.logger.error(
        `Cannot sync topic ${topic.id}: missing lastSync (topic should have been initialized on subscribe)`
      );
      return of([]);
    }

    // Compare timestamps to determine if sync is needed
    const needsFetch = this.shouldFetchHistory(incomingTimestamp, topic.lastSync);

    if (!needsFetch) {
      this.logger.info(
        `Skipping sync for ${topic.id}: no new messages (lastSync=${topic.lastSync}, incoming=${incomingTimestamp})`
      );
      return of([]);
    }

    // Always sync up to current time
    const endTime = toPubNubTimetoken(Date.now());

    this.logger.info(`Fetching history for ${topic.id} from ${topic.lastSync} to ${endTime}`);

    // Fetch history and return notifications
    return this.fetchHistoryAndEmit(topic.id, topic.lastSync, endTime);
  }

  /**
   * Determines if history fetch is needed by comparing timestamps.
   * Uses BigInt for PubNub timetoken comparison.
   */
  private shouldFetchHistory(incomingTimestamp: string, lastSync?: string): boolean {
    if (!lastSync) {
      return true; // No lastSync stored, fetch is needed
    }

    try {
      // Parse PubNub timetokens (17-digit strings)
      const incomingTime = BigInt(incomingTimestamp);
      const lastSyncTime = BigInt(lastSync);

      return incomingTime > lastSyncTime;
    } catch (error) {
      this.logger.warn('Failed to compare timestamps, will fetch:', error);
      return true; // On error, fetch to be safe
    }
  }

  /**
   * Fetches history for a topic and returns notifications.
   * Updates lastSync in topic state and persists after successful fetch.
   */
  fetchHistoryAndEmit(topicId: string, fromTimestamp: string, newLastSync: string): Observable<Notification[]> {
    return this.fetchHistoryWithAuth(topicId, fromTimestamp, false).pipe(
      tap((notifications) => {
        this.logger.info(`Fetched ${notifications.length} notifications for topic ${topicId}`);

        // Update lastSync in topic state
        this.updateTopicState((currentMap) => {
          const newMap = new Map(currentMap);
          const topic = currentMap.get(topicId);
          if (topic) {
            newMap.set(topicId, {
              ...topic,
              lastSync: newLastSync
            });
          }
          return newMap;
        });

        // Persist to storage as side effect
        const topics = [...this.topicsState$.value.values()];
        this.storage
          .setItem(this.storageKeys.getTopics(), topics)
          .pipe(
            catchError((error) => {
              this.logger.warn('Failed to persist topics after sync:', error);
              return EMPTY;
            })
          )
          .subscribe();
      }),
      // Network error retry with backoff
      retryBackoff({
        initialInterval: RETRY_INITIAL_INTERVAL_MS,
        maxRetries: RETRY_MAX_ATTEMPTS,
        resetOnSuccess: true,
        shouldRetry: (error) => isNetworkError(error)
      })
    );
  }

  /**
   * Fetches history with authentication token management.
   * Handles auth errors by clearing token and retrying with refresh (only on first attempt).
   * Network errors are NOT retried here - caller (fetchHistoryAndEmit) handles retry.
   * @param isRetry - If true, forces token refresh and does NOT retry auth errors (unrecoverable)
   */
  private fetchHistoryWithAuth(topicId: string, fromTimestamp: string, isRetry: boolean): Observable<Notification[]> {
    // Force refresh if this is a retry after auth error
    return defer(() => this.config.authProvider.getToken(isRetry)).pipe(
      switchMap((authToken) => {
        // Set token for PubNub client
        this.wrapper.setToken(authToken.token);

        return this.wrapper.fetchHistory([topicId], fromTimestamp).pipe(
          // Transform PubNub response to Notification[]
          map((response) => this.extractNotifications(topicId, response)),

          // Handle errors
          catchError((error) => {
            // Auth error on first attempt: refresh token and retry once
            if (isAuthError(error) && !isRetry) {
              return this.handleAuthErrorWithRetry(topicId, fromTimestamp);
            }

            // Auth error on retry: unrecoverable - let it propagate
            if (isAuthError(error)) {
              this.logger.error(`Auth error after token refresh for ${topicId}, giving up`, error);
              throw error;
            }

            // Network and unknown errors propagate to caller for retry
            if (isNetworkError(error)) {
              this.logger.warn(`Network error fetching history for ${topicId}, will retry`, error);
            } else {
              this.logger.error(`Unknown error fetching history for ${topicId}`, error);
            }
            throw error;
          })
        );
      })
    );
  }

  /**
   * Handles auth errors by clearing token and retrying with refresh.
   * If auth error persists after refresh, fails immediately (unrecoverable).
   * Pattern: auth error → clear token → refresh → retry once → fail if still auth error
   */
  private handleAuthErrorWithRetry(topicId: string, fromTimestamp: string): Observable<Notification[]> {
    this.logger.warn(`Auth error fetching history for ${topicId}, refreshing token`);

    // Clear token and retry with forceRefresh=true
    // If this also fails with auth error, it's unrecoverable - let error propagate
    return this.config.authProvider
      .clearToken()
      .pipe(switchMap(() => this.fetchHistoryWithAuth(topicId, fromTimestamp, true)));
  }

  /**
   * Fetches topics from PubNub with retry logic.
   */
  private fetchTopicsWithRetry(): Observable<Topic[]> {
    return this.wrapper.fetchTopics().pipe(
      catchError((error) => {
        if (isNetworkError(error)) {
          this.logger.warn('Network error while fetching topics, will retry', error);
          throw error;
        }

        this.logger.error('Unknown error while fetching topics', error);
        throw error;
      }),
      retryBackoff({
        initialInterval: RETRY_INITIAL_INTERVAL_MS,
        maxRetries: RETRY_MAX_ATTEMPTS,
        resetOnSuccess: true,
        shouldRetry: (error) => isNetworkError(error)
      })
    );
  }

  /**
   * Extracts notifications from PubNub fetch response.
   */
  private extractNotifications(topicId: string, response: PubNub.History.FetchMessagesResponse): Notification[] {
    const channelMessages = response.channels[topicId];
    if (!channelMessages) {
      return [];
    }

    return channelMessages.map((msg) => this.toNotification(topicId, msg.message, msg.timetoken.toString()));
  }

  /**
   * Transforms raw PubNub message to Notification type.
   */
  private toNotification(topicId: string, message: unknown, timetoken: string): Notification {
    return {
      ...(message as Record<string, unknown>),
      timestamp: new Date(fromPubNubTimetoken(timetoken)).toISOString(),
      topicId
    } as Notification;
  }
}
