import { Observable, of, Subject } from 'rxjs';
import { take, concatMap, catchError } from 'rxjs/operators';
import { NotificationProvider } from '../provider.interface';
import { Notification, StoredTopic } from '../types';
import { toPubNubTimetoken } from '../utils';
import { PubNubPollingConfig } from './types';
import { createTopics$ } from './createTopics';
import { createNotifications$ } from './createNotifications';
import { TopicCommand } from './topicReducer';

/**
 * PubNub polling provider — thin composition layer over pure reactive building blocks.
 *
 * Wires together:
 * - createTopics$: topic state pipeline (storage, fetch, subscribe/unsubscribe)
 * - createNotifications$: notification fetch pipeline (auth, per-topic sync, retry)
 *
 * Only class in the system. Everything else is functions.
 */
export class PubNubPollingProvider implements NotificationProvider {
  readonly topics$: Observable<StoredTopic[]>;
  readonly notifications$: Observable<Notification>;

  private readonly _commands$: Subject<TopicCommand>;
  private readonly config: PubNubPollingConfig;

  constructor(config: PubNubPollingConfig) {
    this.config = config;

    const { topics$, commands$ } = createTopics$({
      topicSync$: config.topicSync$,
      storage: config.storage,
      storageKeys: config.storageKeys,
      wrapper: config.wrapper,
      logger: config.logger
    });

    this.topics$ = topics$;
    this._commands$ = commands$;

    this.notifications$ = createNotifications$({
      notificationSync$: config.notificationSync$,
      topics$,
      authProvider: config.authProvider,
      wrapper: config.wrapper,
      storage: config.storage,
      storageKeys: config.storageKeys,
      logger: config.logger
    });
  }

  subscribe(topicId: string): Observable<void> {
    return this.topics$.pipe(
      take(1),
      concatMap((topics) => {
        const topic = topics.find((t) => t.id === topicId);
        if (!topic) {
          this.config.logger.warn(`Cannot subscribe to unknown topic: ${topicId}`);
          return of(void 0);
        }

        this._commands$.next({ type: 'subscribe', topicId });
        const nowTimetoken = toPubNubTimetoken(Date.now());
        return this.config.storage.setItem(this.config.storageKeys.getLastSync(topicId), nowTimetoken);
      }),
      catchError((error) => {
        this.config.logger.error(`Failed to subscribe to topic ${topicId}:`, error);
        throw error;
      })
    );
  }

  unsubscribe(topicId: string): Observable<void> {
    return this.topics$.pipe(
      take(1),
      concatMap((topics) => {
        const topic = topics.find((t) => t.id === topicId);
        if (!topic) {
          this.config.logger.warn(`Cannot unsubscribe from unknown topic: ${topicId}`);
          return of(void 0);
        }

        this._commands$.next({ type: 'unsubscribe', topicId });
        return this.config.storage.removeItem(this.config.storageKeys.getLastSync(topicId));
      }),
      catchError((error) => {
        this.config.logger.warn(`Failed to unsubscribe from topic ${topicId}:`, error);
        return of(void 0);
      })
    );
  }

  close(): void {
    this._commands$.complete();
    this.config.wrapper.stop();
  }
}
