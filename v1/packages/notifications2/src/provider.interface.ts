import { Observable } from 'rxjs';
import { AuthToken, Notification, Topic } from './types';

/**
 * Provider interface for notification delivery.
 * Abstracts the underlying notification mechanism (polling, real-time, hybrid).
 *
 * Layer 1 responsibilities:
 * - Transform provider-specific data to common Notification/Topic types
 * - Cache observables per topic to prevent duplicates
 * - No knowledge of subscription state (that's Layer 2)
 */
export interface NotificationProvider {
  /**
   * Returns an observable that emits notifications for a specific topic.
   * Must maintain internal Map<topicId, Observable> with shareReplay() to prevent duplicates.
   *
   * @param topicId - Topic identifier (PubNub channel name)
   * @returns Observable emitting notifications for the topic
   */
  notifications$(topicId: string): Observable<Notification>;

  /**
   * Returns an observable that emits available topics from the provider.
   * Topics include metadata only (NO isSubscribed flag).
   *
   * @returns Observable emitting array of topic metadata
   */
  topics$(): Observable<Topic[]>;

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
