import { Observable } from 'rxjs';

/**
 * Generic notification message type (Layer 1).
 * Notifications are JSON objects that include both specific attributes (`id`, `body`, `timestamp`, `title`, `topicId`)
 * and can contain additional properties with unknown structure.
 */
export type Notification = {
  /** Unique identifier for the notification. */
  id: string;
  /** Message content of the notification. */
  body: string;
  /** Timestamp of the notification. */
  timestamp: string;
  /** Title of the notification. */
  title: string;
  /** Id of the topic the notification belongs to. */
  topicId: string;
} & Record<string, unknown>;

/**
 * Generic topic metadata type (Layer 1 - NO isSubscribed).
 * Layer 1 only provides metadata from the provider.
 * Subscription state is managed by Layer 2.
 */
export type Topic = {
  /** Indicates if the topic should be auto-subscribed on first appearance. */
  autoSubscribe: boolean;
  /** Chain of the topic. */
  chain: string;
  /** Unique identifier for the topic. */
  id: string;
  /** Name of the topic. */
  name: string;
  /** Publisher name (e.g. "Midnight Foundation"). */
  publisher: string;
} & Record<string, unknown>;

/**
 * Stored topic with subscription state (Layer 2).
 * Extends Topic with isSubscribed flag.
 * Note: lastSync is stored separately per topic in storage (notifications:lastSync:<topicId>).
 */
export type StoredTopic = Topic & {
  /** Indicates if the topic is currently subscribed. */
  isSubscribed: boolean;
};

/**
 * Sync information for a topic.
 * Used to coordinate fetching history from a specific timestamp.
 */
export interface TopicSyncInfo {
  /** Topic identifier (PubNub channel name). */
  topicId: string;
  /** Starting timestamp for history fetch (PubNub timetoken as string). */
  fromTimestamp: string;
}

/**
 * Cached topics with subscription state (backwards compatible with v1).
 * Stored at notifications:topics key.
 * Format: { lastFetch: number, topics: StoredTopic[] }
 */
export interface CachedTopics {
  /** Timestamp when topics were last fetched (milliseconds). */
  lastFetch: number;
  /** Topics array with subscription state (isSubscribed). */
  topics: StoredTopic[];
}

/**
 * Authentication token response from PubNub Function.
 * This matches the expected API contract from LW-13729.
 */
export type AuthToken = {
  /** PubNub authentication token (TTL encoded) */
  token: string;
  /** Token expiry timestamp in Unix seconds */
  expiresAt: number;
  /** Token refresh margin in seconds */
  refreshMargin: number;
};

/**
 * Observable-based storage interface (breaking change from promise-based).
 * All storage operations return Observables for marble testing compatibility.
 */
export interface StorageAdapter {
  /**
   * Retrieves a value from storage.
   * @param key - Storage key
   * @returns Observable emitting stored value or undefined if not found
   */
  getItem<T>(key: string): Observable<T | undefined>;

  /**
   * Stores a value in storage.
   * @param key - Storage key
   * @param value - Value to store (must be serializable)
   * @returns Observable completing when storage is successful
   */
  setItem<T>(key: string, value: T): Observable<void>;

  /**
   * Removes a value from storage.
   * @param key - Storage key
   * @returns Observable completing when removal is successful
   */
  removeItem(key: string): Observable<void>;
}

/** Logger interface for notifications. */
export interface NotificationsLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}
