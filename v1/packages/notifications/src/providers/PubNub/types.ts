import { NotificationsLogger, NotificationsStorage, Topic } from '../../types';
import { StorageKeys } from '../../StorageKeys';

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
 * Request payload for token authentication endpoint.
 */
export type TokenRequest = {
  /** User identifier for token generation */
  userId: string;
};

/**
 * Token authentication client interface.
 * Abstracts the HTTP communication with PubNub Function.
 */
export interface TokenAuthClient {
  /**
   * Requests a new authentication token from the server.
   * @param userId - User identifier
   * @returns Promise resolving to token response
   * @throws {AuthenticationError} When token request fails
   */
  requestToken(userId: string): Promise<AuthToken>;
}

/**
 * Configuration options for PubNub provider.
 */
export interface PubNubProviderConfiguration {
  /** Heartbeat interval in seconds. Defaults to 60. */
  heartbeatInterval?: number;
  /** Test only! Whether to skip authentication. If true, no auth token will be requested. */
  skipAuthentication?: boolean;
  /** PubNub subscribe key for the application. */
  subscribeKey: string;
  /** PubNub auth endpoint for token requests. */
  tokenEndpoint?: string;
  /** Whether to use polling mode. Defaults to false. */
  usePollingMode?: boolean;
  /** Interval in minutes to fetch missed messages. Defaults to 1440 minutes (1 day). */
  fetchMissedMessagesIntervalMinutes?: number;
}

/**
 * Options for creating a PubNubProvider instance.
 */
export interface PubNubProviderOptions extends PubNubProviderConfiguration {
  /** Logger instance for logging messages. */
  logger: NotificationsLogger;
  /** Storage instance for persisting data. */
  storage: NotificationsStorage;
  /** Storage keys manager for generating storage key names. */
  storageKeys: StorageKeys;
}

/**
 * Message for deleting a topic from the control channel.
 */
export interface ChannelsControlMessageDEL {
  /** Action type: delete topic. */
  action: 'DEL';
  /** ID of the topic to delete. */
  topicId: Topic['id'];
}

/**
 * Message for adding or updating a topic via the control channel.
 */
export interface ChannelsControlMessagePUT {
  /** Action type: add or update topic. */
  action: 'PUT';
  /** ID of the topic. */
  topicId: Topic['id'];
  /** Partial topic details to update. */
  details: Partial<Topic>;
}

/**
 * Cached topics with last fetch timestamp.
 */
export interface CachedTopics {
  /** Last fetch timestamp. */
  lastFetch: number;
  /** Topics. */
  topics: Topic[];
}

/**
 * Union type for all control channel messages.
 */
export type ChannelsControlMessage = ChannelsControlMessageDEL | ChannelsControlMessagePUT;
