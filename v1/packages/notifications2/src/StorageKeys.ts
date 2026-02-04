/**
 * Manages storage keys for notifications with a configurable prefix.
 * Provides methods to retrieve storage keys for various notification-related data.
 *
 * Storage schema (backwards compatible with v1):
 * - notifications:topics - { lastFetch: number, topics: StoredTopic[] }
 * - notifications:lastSync:<topicId> - PubNub timetoken string per subscribed topic
 * - notifications:token - Authentication token
 * - notifications:userId - User identifier
 * - notifications:subscribedTopics (LEGACY - migrated on first load)
 * - notifications:unsubscribedTopics (LEGACY - migrated on first load)
 */
export class StorageKeys {
  private cachedTopics: string;
  private lastSync: string;
  private subscribedTopics: string;
  private token: string;
  private topics: string;
  private unsubscribedTopics: string;
  private userId: string;

  /**
   * Creates a new StorageKeys instance with the specified prefix.
   * @param prefix - The prefix to use for all storage keys (e.g., 'notifications')
   */
  constructor(prefix: string) {
    this.cachedTopics = `${prefix}:cachedTopics`;
    this.lastSync = `${prefix}:lastSync:`;
    this.subscribedTopics = `${prefix}:subscribedTopics`;
    this.token = `${prefix}:token`;
    this.topics = `${prefix}:topics`;
    this.unsubscribedTopics = `${prefix}:unsubscribedTopics`;
    this.userId = `${prefix}:userId`;
  }

  /**
   * Returns the storage key for cached topic metadata from provider.
   * @returns The storage key in the format '{prefix}:cachedTopics'
   */
  public getCachedTopics(): string {
    return this.cachedTopics;
  }

  /**
   * Returns the storage key for the last sync timestamp of a specific topic.
   * @param topicId - The topic identifier
   * @returns The storage key in the format '{prefix}:lastSync:{topicId}'
   */
  public getLastSync(topicId: string): string {
    return `${this.lastSync}${topicId}`;
  }

  /**
   * Returns the storage key for subscribed topics (LEGACY).
   * @deprecated Use getTopics() instead. This key is only used for migration.
   * @returns The storage key in the format '{prefix}:subscribedTopics'
   */
  public getSubscribedTopics(): string {
    return this.subscribedTopics;
  }

  /**
   * Returns the storage key for the authentication token.
   * @returns The storage key in the format '{prefix}:token'
   */
  public getToken(): string {
    return this.token;
  }

  /**
   * Returns the storage key for topics with subscription state.
   * @returns The storage key in the format '{prefix}:topics'
   */
  public getTopics(): string {
    return this.topics;
  }

  /**
   * Returns the storage key for unsubscribed topics (LEGACY).
   * @deprecated Use getTopics() instead. This key is only used for migration.
   * @returns The storage key in the format '{prefix}:unsubscribedTopics'
   */
  public getUnsubscribedTopics(): string {
    return this.unsubscribedTopics;
  }

  /**
   * Returns the storage key for the user ID.
   * @returns The storage key in the format '{prefix}:userId'
   */
  public getUserId(): string {
    return this.userId;
  }
}
