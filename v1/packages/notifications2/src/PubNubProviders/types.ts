import { Observable } from 'rxjs';
import { NotificationsAuthProvider } from '../provider.interface';
import { NotificationsLogger, StorageAdapter } from '../types';
import { StorageKeys } from '../StorageKeys';
import { PubNubRxWrapper } from './PubNubRxWrapper';

/**
 * Configuration for PubNub authentication provider.
 */
export interface PubNubAuthConfig {
  /** User ID for authentication. */
  userId: string;
  /** Token endpoint URL. */
  tokenEndpoint: string;
  /** Storage adapter for persisting tokens across sessions. */
  storage: StorageAdapter;
  /** Storage keys manager for consistent key naming. */
  storageKeys: StorageKeys;
}

/**
 * Configuration for PubNub polling provider.
 */
export interface PubNubPollingConfig {
  /** Authentication provider for fetching tokens. */
  authProvider: NotificationsAuthProvider;
  /** Observable that emits timestamps (PubNub timetokens as strings) to trigger notification sync. */
  notificationSync$: Observable<string>;
  /** Observable that emits signals to refresh topics. */
  topicSync$: Observable<void>;
  /** Storage adapter for topic and state persistence. */
  storage: StorageAdapter;
  /** Storage keys manager. */
  storageKeys: StorageKeys;
  /** Logger instance for logging. */
  logger: NotificationsLogger;
  /** PubNub RxJS wrapper. Use createPubNubWrapper() factory to create. */
  wrapper: PubNubRxWrapper;
}
