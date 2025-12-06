import { validate, v4 } from 'uuid';

import { StorageKeys } from './StorageKeys';
import { Notification, NotificationsLogger, NotificationsStorage, Topic } from './types';
import {
  NotificationsProvider,
  NotificationsProviderOptions,
  NotificationsProviders,
  PubNubPollingProvider,
  PubNubProvider,
  PubNubProviderOptions
} from './providers';
import { ConnectionStatus } from './ConnectionStatus';
import { PendingCommands } from './PendingCommands';
import { getCurrentTimetoken, isArrayOfStrings, unused } from './utils';

/**
 * Pause duration in milliseconds between initialization retry attempts.
 * Set to 1 minute (60,000 ms).
 */
const INIT_RETRY_PAUSE = 60_000; // 1 minute

/**
 * Multiplier for the pause duration between initialization retry attempts.
 * Set to 2.
 */
const INIT_RETRY_PAUSE_MULTIPLIER = 2;

/**
 * Options for creating a NotificationsClient instance.
 */
export interface NotificationsClientOptions {
  /** Logger instance for logging messages. Defaults to console. */
  logger?: NotificationsLogger;
  /** Provider configuration options for the notification service. */
  provider: NotificationsProviderOptions;
  /** Callback invoked when connection status changes. */
  onConnectionStatusChange?: (error?: Error) => void;
  /** Callback invoked when a notification is received. */
  onNotification: (notification: Notification) => void;
  /** Callback invoked when topics list changes. */
  onTopics: (topics: Topic[]) => void;
  /** Storage instance for persisting subscription state. */
  storage: NotificationsStorage;
  /** Prefix for storage keys. Defaults to 'notifications'. */
  storageKeysPrefix?: string;
}

/**
 * Main client for managing notifications.
 * Handles provider initialization, topic subscription management, and notification routing.
 */
export class NotificationsClient {
  private connectionStatus: ConnectionStatus;
  private isClosed = false;
  private isInitialized = false;
  private logger: NotificationsLogger;
  private notifiedTopics = '';
  private onNotification: (notification: Notification) => void;
  private onTopics: (topics: Topic[]) => void;
  private pendingCommands: PendingCommands;
  private provider: NotificationsProvider;
  private storage: NotificationsStorage;
  private storageKeys: StorageKeys;
  private subscribedTopics: Topic['id'][] = [];
  private unsubscribedTopics: Topic['id'][] = [];

  /**
   * Creates a new NotificationsClient instance.
   * Validates options, initializes the provider, and starts the initialization process.
   *
   * @param options - Configuration options for the client
   * @throws {TypeError} If any required option is missing or has an invalid type
   */
  // eslint-disable-next-line complexity, sonarjs/cognitive-complexity, max-statements
  constructor(options: NotificationsClientOptions) {
    if (typeof options !== 'object' || options === null) throw new TypeError('options must be an object');
    if (typeof options.provider !== 'object' || options.provider === null)
      throw new TypeError('provider must be an object');
    if (
      options.provider.configuration !== undefined &&
      (typeof options.provider.configuration !== 'object' || options.provider.configuration === null)
    )
      throw new TypeError('provider.configuration must be an object');

    const { logger, provider, onConnectionStatusChange, onNotification, onTopics, storage, storageKeysPrefix } = {
      logger: console,
      onConnectionStatusChange: unused,
      storageKeysPrefix: 'notifications',
      ...options
    };

    // TODO: Use Zod to validate the options
    if (typeof logger !== 'object' || logger === null) throw new TypeError('logger must be an object');
    if (typeof logger.info !== 'function') throw new TypeError('logger.info must be a function');
    if (typeof logger.warn !== 'function') throw new TypeError('logger.warn must be a function');
    if (typeof logger.error !== 'function') throw new TypeError('logger.error must be a function');
    if (typeof provider.name !== 'string') throw new TypeError('provider.name must be a string');
    if (!NotificationsProviders.includes(provider.name))
      throw new TypeError(`provider.name must be one of the following: ${NotificationsProviders.join(', ')}`);
    if (typeof onConnectionStatusChange !== 'function')
      throw new TypeError('onConnectionStatusChange must be a function');
    if (typeof onNotification !== 'function') throw new TypeError('onNotification must be a function');
    if (typeof onTopics !== 'function') throw new TypeError('onTopics must be a function');
    if (typeof storage !== 'object' || storage === null) throw new TypeError('storage must be an object');
    if (typeof storage.getItem !== 'function') throw new TypeError('storage.getItem must be a function');
    if (typeof storage.removeItem !== 'function') throw new TypeError('storage.removeItem must be a function');
    if (typeof storage.setItem !== 'function') throw new TypeError('storage.setItem must be a function');
    if (typeof storageKeysPrefix !== 'string') throw new TypeError('storageKeysPrefix must be a string');

    this.logger = logger;
    this.onNotification = onNotification;
    this.onTopics = onTopics;
    this.storage = storage;
    this.storageKeys = new StorageKeys(storageKeysPrefix);

    // Currently the only supported provider is PubNub
    if (provider.name === 'PubNub') {
      const configuration = {
        heartbeatInterval: 0,
        usePollingMode: true,
        ...provider.configuration
      };
      const { heartbeatInterval, skipAuthentication, subscribeKey, tokenEndpoint, usePollingMode } = configuration;

      // TODO: Use Zod to validate the options
      if (typeof heartbeatInterval !== 'number')
        throw new TypeError('provider.configuration.heartbeatInterval must be a number');
      if (skipAuthentication !== undefined && typeof skipAuthentication !== 'boolean')
        throw new TypeError('provider.configuration.skipAuthentication must be a boolean');
      if (typeof subscribeKey !== 'string') throw new TypeError('provider.configuration.subscribeKey must be a string');
      if (tokenEndpoint !== undefined && typeof tokenEndpoint !== 'string')
        throw new TypeError('provider.configuration.tokenEndpoint must be a string');

      const configOptions: PubNubProviderOptions = {
        logger,
        storage,
        storageKeys: this.storageKeys,
        subscribeKey,
        ...configuration
      };

      this.provider = usePollingMode ? new PubNubPollingProvider(configOptions) : new PubNubProvider(configOptions);
    }

    this.pendingCommands = new PendingCommands(this.provider);

    this.connectionStatus = new ConnectionStatus(logger, (error?: Error) => {
      onConnectionStatusChange(error);

      if (!error) this.pendingCommands.onConnectionRestored();
    });

    this.initTillSuccess().catch((error) => {
      logger.error('NotificationsClient: Failed while retrying to initialize notifications client', error);
    });
  }

  /**
   * Closes the notifications client and releases all resources.
   * Unsubscribes from all topics and closes the provider connection.
   *
   * @returns Promise that resolves when the client is fully closed
   */
  async close(): Promise<void> {
    if (this.isClosed) return;

    this.isClosed = true;

    await this.provider.close();

    this.connectionStatus = undefined as unknown as ConnectionStatus;
    this.pendingCommands = { onConnectionRestored: unused } as unknown as PendingCommands;
    this.provider = undefined as unknown as NotificationsProvider;
    this.storageKeys = undefined as unknown as StorageKeys;
  }

  /**
   * Retrieves channel names from storage, validating the format.
   *
   * @param key - Storage key to retrieve
   * @returns Promise that resolves to an array of channel names, or empty array if invalid
   */
  private async getChannelsNames(key: string): Promise<Topic['id'][]> {
    const value = await this.storage.getItem<Topic['id'][]>(key);

    if (value === undefined) return [];

    if (!isArrayOfStrings(value)) {
      this.logger.warn('NotificationsClient: Got an invalid channels list from storage', { key, value });

      return [];
    }

    return value;
  }

  /**
   * Retrieves the user ID from storage or generates a new one if not found.
   * Validates that the stored user ID is a valid UUID v4.
   *
   * @returns Promise that resolves to a valid UUID v4 string
   * @throws {TypeError} If the stored user ID is not a string
   * @throws {Error} If the stored user ID is not a valid UUID
   */
  private async getUserId(): Promise<string> {
    const userId = await this.storage.getItem<string>(this.storageKeys.getUserId());

    if (userId !== undefined) {
      if (typeof userId !== 'string') {
        const message = 'NotificationsClient: User ID got from storage is not a string';

        this.logger.error(message, userId);

        throw new TypeError(message);
      }

      if (validate(userId)) return userId;

      throw new Error(`NotificationsClient: User ID got from storage is not a valid UUID: ${userId}`);
    }

    const newUserId = v4();

    await this.storage.setItem(this.storageKeys.getUserId(), newUserId);

    return newUserId;
  }

  /**
   * Ensures the client is initialized and not closed.
   * Throws an error if the client is not ready for operations.
   *
   * @throws {Error} If the client is not initialized or is closed
   */
  ensureIsOperational(): void {
    if (!this.isInitialized) throw new Error('NotificationsClient is not initialized');
    if (this.isClosed) throw new Error('NotificationsClient is closed');
  }

  /**
   * Initializes the notifications client.
   * Loads topics from the provider, restores subscription state from storage,
   * and subscribes to topics that should be auto-subscribed.
   *
   * @returns Promise that resolves when initialization is complete
   */
  private async init(): Promise<void> {
    const { connectionStatus, onNotification, provider, storageKeys, trackTopics, storage } = this;

    const userId = await this.getUserId();
    const subscribedTopicsKey = storageKeys.getSubscribedTopics();
    const unsubscribedTopicsKey = storageKeys.getUnsubscribedTopics();
    const [subscribedTopics, unsubscribedTopics] = await Promise.all([
      this.getChannelsNames(subscribedTopicsKey),
      this.getChannelsNames(unsubscribedTopicsKey)
    ]);
    this.subscribedTopics = subscribedTopics;
    this.unsubscribedTopics = unsubscribedTopics;
    const topics = await provider.init({ connectionStatus, onNotification, onTopics: trackTopics.bind(this), userId });

    this.notifyTopics(topics);

    for (const topic of topics) {
      if (subscribedTopics.includes(topic.id)) topic.isSubscribed = true;
      else if (!unsubscribedTopics.includes(topic.id)) {
        if (topic.autoSubscribe) {
          topic.isSubscribed = true;
          await storage.setItem(storageKeys.getLastSync(topic.id), getCurrentTimetoken());
          subscribedTopics.push(topic.id);
        } else unsubscribedTopics.push(topic.id);
      }
    }

    await this.updateTopics();

    this.isInitialized = true;

    for (const topic of topics.filter(({ isSubscribed }) => isSubscribed)) await this.subscribe(topic.id, true);
  }

  /**
   * Pauses execution for a specified duration.
   * Used to wait between initialization retry attempts.
   *
   * @param ms - Number of milliseconds to pause
   * @returns Promise that resolves after the specified delay
   */
  private async initRetryPause(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Initializes the notifications client with automatic retry logic.
   * Retries initialization on failure, removing the stored token before each retry attempt
   * and pausing for {@link INIT_RETRY_PAUSE} milliseconds between attempts.
   * Continues retrying until initialization succeeds.
   *
   * @returns Promise that resolves when initialization succeeds
   */
  private async initTillSuccess(): Promise<void> {
    let retry = false;
    let retryPause = INIT_RETRY_PAUSE;

    do {
      try {
        if (retry) await this.storage.removeItem(this.storageKeys.getToken());

        retry = false;
        await this.init();
      } catch (error) {
        retry = true;
        this.logger.error('NotificationsClient: Failed to initialize notifications client', error);
        await this.initRetryPause(retryPause);
        retryPause *= INIT_RETRY_PAUSE_MULTIPLIER;
      }
    } while (retry);
  }

  /**
   * Notifies listeners about topic changes.
   * Only notifies if the topics list has actually changed (by comparing JSON strings).
   *
   * @param topics - Array of topics to notify about
   */
  private notifyTopics(topics: Topic[]): void {
    const stringifiedTopics = JSON.stringify(topics);

    if (stringifiedTopics === this.notifiedTopics) return;

    this.notifiedTopics = stringifiedTopics;

    try {
      this.onTopics(JSON.parse(stringifiedTopics));
    } catch (error) {
      this.logger.error('NotificationsClient: Failed to notify topics', error);
    }
  }

  /**
   * Tracks topic changes from the provider.
   * Filters out removed topics, handles new topics, and updates storage.
   * Auto-subscribes to new topics with the autoSubscribe flag.
   *
   * @param topics - Array of current topics from the provider
   */
  private trackTopics(topics: Topic[]): void {
    const allTopicIds = new Set(topics.map(({ id }) => id));

    this.subscribedTopics = this.subscribedTopics.filter((topicId) => allTopicIds.has(topicId));
    this.unsubscribedTopics = this.unsubscribedTopics.filter((topicId) => allTopicIds.has(topicId));

    const knownTopicIds = new Set([...this.subscribedTopics, ...this.unsubscribedTopics]);

    for (const topic of topics)
      if (!knownTopicIds.has(topic.id)) {
        this.unsubscribedTopics.push(topic.id);

        if (topic.autoSubscribe) {
          this.storage
            .setItem(this.storageKeys.getLastSync(topic.id), getCurrentTimetoken())
            .then(() => this.subscribe(topic.id))
            .catch((error) => this.logger.error('NotificationsClient: Failed to subscribe to topic', topic.id, error));
        }
      }

    this.updateTopics()
      .then(() => this.notifyTopics(topics))
      .catch((error) => this.logger.error('NotificationsClient: Failed to update topics', error));
  }

  /**
   * Updates the stored subscription state in storage.
   * Persists both subscribed and unsubscribed topic lists.
   *
   * @returns Promise that resolves when storage is updated
   */
  private async updateTopics(): Promise<void> {
    await Promise.all([
      this.storage.setItem(this.storageKeys.getSubscribedTopics(), this.subscribedTopics),
      this.storage.setItem(this.storageKeys.getUnsubscribedTopics(), this.unsubscribedTopics)
    ]);
  }

  /**
   * Subscribes to a topic.
   * Updates internal state, persists to storage, and subscribes via the provider.
   *
   * @param topicId - The ID of the topic to subscribe to
   * @returns Promise that resolves when subscription is complete
   * @throws {Error} If the client is not operational, topic is already subscribed, or topic is unknown
   */
  async subscribe(topicId: Topic['id'], fromInit = false): Promise<void> {
    this.ensureIsOperational();

    if (!fromInit) {
      if (this.subscribedTopics.includes(topicId))
        throw new Error(`NotificationsClient: Topic already subscribed ${topicId}`);
      if (!this.unsubscribedTopics.includes(topicId)) throw new Error(`NotificationsClient: Unknown topic ${topicId}`);

      this.subscribedTopics.push(topicId);
      this.unsubscribedTopics.splice(this.unsubscribedTopics.indexOf(topicId), 1);

      await this.storage.setItem(this.storageKeys.getLastSync(topicId), getCurrentTimetoken());
    }

    await this.updateTopics();

    const done = this.pendingCommands.add('subscribe', topicId);

    await this.provider.subscribe(topicId);

    done();
  }

  /**
   * Unsubscribes from a topic.
   * Updates internal state, persists to storage, and unsubscribes via the provider.
   *
   * @param topicId - The ID of the topic to unsubscribe from
   * @returns Promise that resolves when unsubscription is complete
   * @throws {Error} If the client is not operational, topic is already unsubscribed, or topic is unknown
   */
  async unsubscribe(topicId: Topic['id']): Promise<void> {
    this.ensureIsOperational();

    if (this.unsubscribedTopics.includes(topicId))
      throw new Error(`NotificationsClient: Topic already unsubscribed ${topicId}`);
    if (!this.subscribedTopics.includes(topicId)) throw new Error(`NotificationsClient: Unknown topic ${topicId}`);

    this.subscribedTopics.splice(this.subscribedTopics.indexOf(topicId), 1);
    this.unsubscribedTopics.push(topicId);

    await this.updateTopics();

    const done = this.pendingCommands.add('unsubscribe', topicId);

    await this.provider.unsubscribe(topicId);

    done();
  }

  /**
   * Updates the interval for fetching missed messages.
   * Only works if the provider is PubNubPollingProvider.
   *
   * @param intervalMinutes - New interval in minutes
   */
  updateFetchMissedMessagesInterval(intervalMinutes: number): void {
    if (this.provider instanceof PubNubPollingProvider) {
      if (typeof intervalMinutes !== 'number' || intervalMinutes <= 0)
        throw new TypeError('NotificationsClient: intervalMinutes must be a positive number');
      this.provider.updateFetchMissedMessagesInterval(intervalMinutes);
    }
  }
}
