import { ConnectionStatus } from '../ConnectionStatus';
import { Notification, Topic } from '../types';

/**
 * Options for initializing a notification provider.
 */
export interface ProviderInitOptions {
  /** Connection status manager for reporting status changes. */
  connectionStatus: ConnectionStatus;
  /** Callback invoked when a notification is received. */
  onNotification: (notification: Notification) => void;
  /** Callback invoked when the topics list changes. */
  onTopics: (topics: Topic[]) => void;
  /** User ID for provider authentication. */
  userId: string;
}

/**
 * Interface for notification providers.
 * Providers must implement methods to subscribe and unsubscribe from topics.
 */
export interface NotificationsProvider {
  /**
   * Closes the connection to the notification provider.
   * @returns Promise that resolves when the connection is closed
   */
  close(): Promise<void>;

  /**
   * Initializes the notification provider.
   * @returns Promise that resolves with the list of available topics
   */
  init(options: ProviderInitOptions): Promise<Topic[]>;

  /**
   * Subscribes to a topic to receive notifications.
   * @param topicId - The unique identifier of the topic to subscribe to
   * @returns Promise that resolves when the subscription is successful
   */
  subscribe(topicId: Topic['id']): Promise<void>;

  /**
   * Unsubscribes from a topic to stop receiving notifications.
   * @param topicId - The unique identifier of the topic to unsubscribe from
   * @returns Promise that resolves when the unsubscription is successful
   */
  unsubscribe(topicId: Topic['id']): Promise<void>;
}
