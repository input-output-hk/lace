import { Observable } from 'rxjs';
import { AuthToken, Notification, StoredTopic } from './types';

/**
 * Provider interface for notification delivery.
 * Abstracts the underlying notification mechanism (polling, real-time, hybrid).
 *
 * Responsibilities:
 * - Manage topic storage with subscription state
 * - Transform provider-specific data to common Notification/Topic types
 * - Handle subscription/unsubscription lifecycle
 * - Emit all notifications on a single observable
 */
export interface NotificationProvider {
  /**
   * Returns an observable that emits notifications for ALL subscribed topics.
   * Single observable instead of per-topic observables.
   *
   * @returns Observable emitting notifications from all subscribed topics
   */
  readonly notifications$: Observable<Notification>;

  /**
   * Returns an observable that emits available topics with subscription status.
   * Topics include both metadata and isSubscribed state.
   *
   * @returns Observable emitting array of stored topics with subscription status
   */
  readonly topics$: Observable<StoredTopic[]>;

  /**
   * Subscribes to a topic by setting isSubscribed=true.
   * Initializes lastSync to current timestamp (messages from now onwards).
   *
   * @param topicId - Topic identifier to subscribe to
   * @returns Observable completing when subscription is persisted
   */
  subscribe(topicId: string): Observable<void>;

  /**
   * Unsubscribes from a topic by setting isSubscribed=false.
   * Clears lastSync timestamp.
   *
   * @param topicId - Topic identifier to unsubscribe from
   * @returns Observable completing when unsubscription is persisted
   */
  unsubscribe(topicId: string): Observable<void>;

  /**
   * Closes the provider and releases resources.
   */
  close(): void;
}

/**
 * Authentication provider interface.
 * Handles token fetching with caching and storage persistence.
 * Returns full AuthToken with expiry information from the endpoint.
 */
export interface NotificationsAuthProvider {
  /**
   * Fetches an authentication token with expiry metadata.
   * Checks cache first unless forceRefresh is true.
   * Validates cached tokens are not expiring soon.
   *
   * @param forceRefresh - If true, bypasses cache and fetches new token (defaults to false)
   * @returns Observable emitting the AuthToken object
   */
  getToken(forceRefresh?: boolean): Observable<AuthToken>;

  /**
   * Clears cached token from memory and storage.
   * Useful for logout or when token is known to be invalid.
   *
   * @returns Observable completing when token is cleared
   */
  clearToken(): Observable<void>;
}
