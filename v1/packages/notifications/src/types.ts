/**
 * Generic topic type.
 * Topics are JSON objects that include specific attributes (`autoSubscribe`, `chain`, `id`, `isSubscribed`, `name`)
 * and can contain additional properties with unknown structure.
 * Consumers are responsible for runtime validation and type narrowing.
 */

export type Topic = {
  /** Indicates if the topic is auto-subscribed. */
  autoSubscribe: boolean;
  /** Chain of the topic. */
  chain: string;
  /** Unique identifier for the topic. */
  id: string;
  /** Indicates if the topic is subscribed. */
  isSubscribed: boolean;
  /** Name of the topic. */
  name: string;
  /** Publisher name (e.g. "Midnight Foundation"). */
  publisher: string;
} & Record<string, unknown>;

/**
 * Generic notification message type.
 * Notifications are JSON objects that include both specific attributes (`id`, `message`, `timestamp`, `title`, `topicId`)
 * and can contain additional properties with unknown structure.
 * Consumers are responsible for runtime validation and type narrowing.
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

/** Logger interface for notifications. */
export interface NotificationsLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * Platform-agnostic storage interface for persisting notification state.
 * Compatible with lace-platform StorageAdapter pattern.
 *
 * Implementations should handle serialization/deserialization of values.
 * All methods are async to support both synchronous and asynchronous storage backends.
 *
 * @example
 * ```typescript
 * // Extension storage implementation
 * const extensionStorage: Storage = {
 *   async getItem<T>(key: string): Promise<T | undefined> {
 *     const result = await chrome.storage.local.get(key);
 *     return result[key];
 *   },
 *   async removeItem(key: string): Promise<void> {
 *     await chrome.storage.local.remove(key);
 *   },
 *   async setItem<T>(key: string, value: T): Promise<void> {
 *     await chrome.storage.local.set({ [key]: value });
 *   }
 * };
 * ```
 */
export interface NotificationsStorage {
  /**
   * Retrieves a value from storage.
   * @param key - Storage key
   * @returns Promise resolving to stored value or undefined if not found
   */
  getItem<T>(key: string): Promise<T | undefined>;

  /**
   * Removes a value from storage.
   * @param key - Storage key
   */
  removeItem(key: string): Promise<void>;

  /**
   * Stores a value in storage.
   * @param key - Storage key
   * @param value - Value to store (must be serializable)
   */
  setItem<T>(key: string, value: T): Promise<void>;
}
