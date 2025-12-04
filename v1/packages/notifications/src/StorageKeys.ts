/**
 * Manages storage keys for notifications with a configurable prefix.
 * Provides methods to retrieve storage keys for various notification-related data.
 */
export class StorageKeys {
  private lastFetchMissedMessages: string;
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
    this.lastFetchMissedMessages = `${prefix}:lastFetchMissedMessages`;
    this.lastSync = `${prefix}:lastSync:`;
    this.subscribedTopics = `${prefix}:subscribedTopics`;
    this.token = `${prefix}:token`;
    this.topics = `${prefix}:topics`;
    this.unsubscribedTopics = `${prefix}:unsubscribedTopics`;
    this.userId = `${prefix}:userId`;
  }

  /**
   * Returns the storage key for the last fetch timestamp of missed messages.
   * @returns The storage key in the format '{prefix}:lastFetchMissedMessages'
   */
  public getLastFetchMissedMessages(): string {
    return this.lastFetchMissedMessages;
  }

  /**
   * Returns the storage key for the last sync timestamp of a specific topic.
   * @param topic - The topic identifier
   * @returns The storage key in the format '{prefix}:lastSync:{topic}'
   */
  public getLastSync(topic: string): string {
    return `${this.lastSync}${topic}`;
  }

  /**
   * Returns the storage key for subscribed topics.
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
   * Returns the storage key for topics.
   * @returns The storage key in the format '{prefix}:topics'
   */
  public getTopics(): string {
    return this.topics;
  }

  /**
   * Returns the storage key for unsubscribed topics.
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
