import { Observable, of } from 'rxjs';
import { switchMap, map, concatMap, catchError } from 'rxjs/operators';
import PubNub from 'pubnub';
import { Notification, TopicId, StorageAdapter, NotificationsLogger } from '../types';
import { fromPubNubTimetoken } from '../utils';
import { StorageKeys } from '../StorageKeys';
import { PubNubRxWrapper } from './PubNubRxWrapper';

const shouldFetch = (incomingTimestamp: string, lastSync: string, logger: NotificationsLogger): boolean => {
  try {
    return BigInt(incomingTimestamp) > BigInt(lastSync);
  } catch (error) {
    logger.warn('Failed to compare timestamps, will not fetch:', error);
    return false;
  }
};

const extractNotifications = (topicId: TopicId, response: PubNub.History.FetchMessagesResponse): Notification[] => {
  const channelMessages = response.channels[topicId];
  if (!channelMessages) {
    return [];
  }

  return channelMessages.map((msg) => ({
    ...(msg.message as Record<string, unknown>),
    timestamp: new Date(fromPubNubTimetoken(msg.timetoken.toString())).toISOString(),
    topicId
  })) as Notification[];
};

/**
 * Fetches notifications for a single topic if there are new messages since last sync.
 *
 * Flow:
 * 1. Read lastSync timetoken from storage
 * 2. Compare incomingTimestamp with lastSync (BigInt comparison)
 * 3. If newer: fetch history from PubNub, persist new lastSync, return notifications
 * 4. If not newer or missing lastSync: return []
 *
 * Does NOT handle auth or network retry — caller wraps with withAuthRetry/withNetworkRetry.
 * Storage failures on read → return []. Storage failures on write → still return notifications.
 *
 * @param topicId - Topic to sync
 * @param incomingTimestamp - PubNub timetoken from the sync signal
 * @param deps - Dependencies (wrapper, storage, storageKeys, logger)
 * @returns Observable emitting Notification[] (may be empty)
 */
export const syncTopicNotifications = (
  topicId: TopicId,
  incomingTimestamp: string,
  deps: {
    wrapper: PubNubRxWrapper;
    storage: StorageAdapter;
    storageKeys: StorageKeys;
    logger: NotificationsLogger;
  }
): Observable<Notification[]> => {
  const { wrapper, storage, storageKeys, logger } = deps;

  return storage.getItem<string>(storageKeys.getLastSync(topicId)).pipe(
    catchError((error) => {
      logger.warn(`Failed to read lastSync for topic ${topicId}:`, error);
      return of(undefined as string | undefined);
    }),
    switchMap((lastSync) => {
      if (!lastSync) {
        logger.warn(`Cannot sync topic ${topicId}: missing lastSync`);
        return of([] as Notification[]);
      }

      if (!shouldFetch(incomingTimestamp, lastSync, logger)) {
        return of([] as Notification[]);
      }

      return wrapper.fetchHistory([topicId], lastSync).pipe(
        map((response) => extractNotifications(topicId, response)),
        concatMap((notifications) =>
          storage.setItem(storageKeys.getLastSync(topicId), incomingTimestamp).pipe(
            map(() => notifications),
            catchError((error) => {
              logger.warn(`Failed to persist lastSync for topic ${topicId}:`, error);
              return of(notifications);
            })
          )
        )
      );
    })
  );
};
