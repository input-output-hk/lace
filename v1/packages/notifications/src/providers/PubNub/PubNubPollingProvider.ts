import { unused } from '../../utils';
import { Notification, NotificationsLogger, NotificationsStorage, Topic } from '../../types';
import { NotificationsProvider, ProviderInitOptions } from '../types';
import PubNub from 'pubnub';
import { TokenManager } from './TokenManager';
import { PubNubFunctionClient } from './PubnubFunctionClient';
import { StorageKeys } from '../../StorageKeys';
import { CachedTopics, PubNubProviderOptions } from './types';
import { retryBackoff } from 'backoff-rxjs';
import { firstValueFrom, from } from 'rxjs';
import { channelsToTopics, REFRESH_CHANNEL_INTERVAL, TOKEN_RETRY_CONFIG } from './utils';

/**
 * PubNub implementation of the NotificationsProvider interface.
 * Handles PubNub connection, channel subscription, and message routing.
 */
export class PubNubPollingProvider implements NotificationsProvider {
  private readonly config: PubNub.PubNubConfiguration;
  private readonly logger: NotificationsLogger;
  private onNotification: (notification: Notification) => void = unused;
  private onTopics: (topics: Topic[]) => void = unused;
  private pubnub: PubNub;
  private refreshChannelsInterval: NodeJS.Timeout | undefined = undefined;
  private refreshChannelsTimeout: NodeJS.Timeout | undefined = undefined;
  private readonly skipAuthentication?: boolean;
  private readonly storage: NotificationsStorage;
  private readonly storageKeys: StorageKeys;
  private readonly tokenEndpoint: string;
  private topics: Topic[] = [];
  private isClosed = false;
  private userId: string | undefined = undefined;
  private isFetchingMessages = false;

  /**
   * Creates a new PubNubProvider instance.
   *
   * @param options - Configuration options for the provider
   */
  constructor(options: PubNubProviderOptions) {
    const { heartbeatInterval, logger, skipAuthentication, storage, storageKeys, subscribeKey } = {
      heartbeatInterval: 0,
      ...options
    };
    const { tokenEndpoint } = {
      tokenEndpoint: `https://ps.pndsn.com/v1/blocks/sub-key/${subscribeKey}/token/subscriber`,
      ...options
    };

    this.logger = logger;
    this.skipAuthentication = skipAuthentication;
    this.storage = storage;
    this.storageKeys = storageKeys;
    this.tokenEndpoint = tokenEndpoint;
    this.config = {
      // authKey,
      autoNetworkDetection: true,
      heartbeatInterval,
      restore: true,
      subscribeKey
    };
  }

  /**
   * Closes the PubNub connection and unsubscribes from all channels.
   * Returns a promise that resolves when the connection is fully closed.
   *
   * @returns Promise that resolves when the connection is closed
   */
  async close(): Promise<void> {
    this.isClosed = true;
    if (this.refreshChannelsInterval) clearInterval(this.refreshChannelsInterval);
    if (this.refreshChannelsTimeout) clearTimeout(this.refreshChannelsTimeout);
    this.pubnub.destroy();
  }

  /**
   * Fetches and processes missed messages for a single topic.
   *
   * @param topic - The topic to fetch messages for
   * @returns Promise that resolves when messages are fetched and processed
   */
  private async fetchMessagesForTopic(topic: Topic): Promise<void> {
    const end = (await this.storage.getItem<string>(this.storageKeys.getLastSync(topic.id))) || '0';
    const response = await firstValueFrom(
      from(this.pubnub.fetchMessages({ channels: [topic.id], count: 100, end })).pipe(retryBackoff(TOKEN_RETRY_CONFIG))
    );
    const messages = response.channels[topic.id];

    if (messages) {
      for (const { channel, message, timetoken } of messages)
        await this.processNotification(channel, message, timetoken.toString());
    }
  }

  /**
   * Fetches missed messages for subscribed topics.
   * Retrieves messages that arrived while the client was offline or disconnected.
   * Processes messages for topics that are either currently subscribed or were previously subscribed
   * (stored in subscribedTopics). Uses the last sync timestamp to fetch only new messages.
   * Verifies token validity before fetching and updates lastFetchMissedMessages after successful fetch.
   * Prevents concurrent execution - if a fetch is already in progress, subsequent calls are ignored.
   *
   * @returns Promise that resolves when all missed messages have been fetched and processed
   */
  private async fetchMissedMessages(): Promise<void> {
    if (this.isFetchingMessages) {
      return;
    }

    if (!this.userId) {
      this.logger.error('NotificationsClient:PubNubProvider: Cannot fetch messages without userId');
      return;
    }

    this.isFetchingMessages = true;

    try {
      // Verify token validity before fetching
      if (!this.skipAuthentication) {
        await this.getAuthKey(this.userId);
      }

      const subscribedTopics =
        (await this.storage.getItem<Topic['id'][]>(this.storageKeys.getSubscribedTopics())) || [];

      for (const topic of this.topics) {
        if (topic.isSubscribed || subscribedTopics.includes(topic.id)) {
          await this.fetchMessagesForTopic(topic);
        }
      }

      // Update lastFetchMissedMessages after successful fetch
      await this.storage.setItem(this.storageKeys.getLastFetchMissedMessages(), Date.now());
    } catch (error) {
      this.logger.error(
        'NotificationsClient:PubNubProvider: Failed to fetch missed messages',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      this.isFetchingMessages = false;
    }
  }

  /**
   * Retrieves the authentication key (token) for PubNub.
   * Creates a TokenManager instance and requests a valid token.
   * Token refresh is now handled only before fetch operations, not on a schedule.
   * Updates the PubNub instance with the new token.
   *
   * @returns Promise that resolves to the authentication token
   */
  private async getAuthKey(userId: string): Promise<string> {
    const tokenManager = new TokenManager(
      new PubNubFunctionClient(this.tokenEndpoint),
      this.storage,
      this.storageKeys,
      userId
    );

    const token = await firstValueFrom(from(tokenManager.getValidToken()).pipe(retryBackoff(TOKEN_RETRY_CONFIG)));

    // Update the PubNub instance with the new token
    this.pubnub.setToken(token.token);

    return token.token;
  }

  /**
   * Initializes the PubNub provider.
   * Sets up authentication, listeners, and retrieves all available topics.
   * Checks PostHog feature flag for latestMessageTimestamp and fetches if newer than local timestamp.
   *
   * @param options - Initialization options including callbacks and connection status
   * @returns Promise that resolves to an array of available topics
   */
  async init(options: ProviderInitOptions): Promise<Topic[]> {
    const { onNotification, onTopics, userId } = options;
    this.userId = userId;

    this.pubnub = new PubNub({ ...this.config, userId });
    this.onNotification = onNotification;
    this.onTopics = onTopics;

    const cachedTopics = await this.storage.getItem<CachedTopics>(this.storageKeys.getTopics());

    if (!cachedTopics || cachedTopics.lastFetch < Date.now() - REFRESH_CHANNEL_INTERVAL)
      this.topics = await this.refreshChannels();
    else {
      this.topics = cachedTopics.topics;
      this.onTopics(this.topics);

      this.refreshChannelsTimeout = setTimeout(
        this.refreshChannels.bind(this),
        REFRESH_CHANNEL_INTERVAL - (Date.now() - cachedTopics.lastFetch)
      );
    }

    return this.topics;
  }

  /**
   * Processes a notification message from a topic channel.
   * Validates the notification object, adds the topicId, calls the onNotification callback,
   * and stores the last sync timestamp for the topic.
   *
   * @param topicId - The ID of the topic (channel) the notification came from
   * @param notification - The notification message object (must be a non-null object)
   * @param timetoken - The PubNub timetoken for the message
   * @returns Promise that resolves when the notification is processed and timestamp is stored
   * @throws Error if the notification is not a valid object
   */
  private processNotification(topicId: Topic['id'], notification: unknown, timetoken: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (typeof notification !== 'object' || notification === null) {
        const msg = 'NotificationsClient:PubNubProvider: Invalid notification';

        this.logger.error(msg, notification);

        reject(new Error(msg));
      } else
        resolve(
          this.onNotification({
            ...notification,
            // eslint-disable-next-line no-magic-numbers
            timestamp: new Date(Number(timetoken) / 10_000).toISOString(),
            topicId
          } as Notification)
        );
    }).then(() =>
      this.storage.setItem(this.storageKeys.getLastSync(topicId), (BigInt(timetoken) + BigInt(1)).toString())
    );
  }

  /**
   * Subscribes to a topic (channel).
   * Updates the topic's subscription status and notifies listeners.
   *
   * @param topicId - The ID of the topic to subscribe to
   * @returns Promise that resolves when the subscription is confirmed
   */
  async subscribe(topicId: Topic['id']): Promise<void> {
    for (const topic of this.topics) if (topic.id === topicId) topic.isSubscribed = true;
    this.onTopics(this.topics);
  }

  /**
   * Refreshes the list of available topics by fetching channel metadata from PubNub.
   * Fetches all channel metadata, converts them to topics, and stores them in cache.
   * Sets up a periodic refresh interval if one doesn't already exist.
   * This method is called periodically (every 24 hours) to keep topics in sync with PubNub.
   *
   * @returns Promise that resolves to an array of available topics
   */
  async refreshChannels(): Promise<Topic[]> {
    const { data: channels } = await this.pubnub.objects.getAllChannelMetadata({ include: { customFields: true } });
    const topics = channelsToTopics(channels, this.pubnub, this.logger);

    this.storage.setItem(this.storageKeys.getTopics(), { lastFetch: Date.now(), topics });

    if (!this.refreshChannelsInterval)
      this.refreshChannelsInterval = setInterval(this.refreshChannelsOnInterval.bind(this), REFRESH_CHANNEL_INTERVAL);

    return topics;
  }

  /**
   * Periodic callback for refreshing channels.
   * Called by the interval timer set up in {@link refreshChannels}.
   * Refreshes the topics list and notifies listeners if topics have changed.
   * Errors during refresh are logged but do not throw exceptions.
   */
  refreshChannelsOnInterval(): void {
    this.refreshChannels()
      .then((topics) => {
        if (JSON.stringify(topics) !== JSON.stringify(this.topics)) {
          this.topics = topics;
          this.onTopics(this.topics);
        }
      })
      .catch((error) => this.logger.error('NotificationsClient:PubNubProvider: Failed to refresh channels', error));
  }

  /**
   * Updates the latest message timestamp from PostHog.
   * Converts ISO string to Unix milliseconds and compares with stored timestamp.
   * Triggers fetch if PostHog timestamp is newer.
   * Updating the timestamp is awaited, but fetch is not because it will run in the background and advertise updates on the callbacks
   *
   * @param isoTimestamp - ISO 8601 string timestamp from PostHog
   */
  async updateLatestMessageTimestamp(isoTimestamp: string): Promise<void> {
    if (this.isClosed || !this.userId) {
      return;
    }

    try {
      // Convert ISO string to Unix milliseconds
      const posthogTimestamp = Date.parse(isoTimestamp);

      if (Number.isNaN(posthogTimestamp)) {
        throw new TypeError(`PubNubPollingProvider: Invalid ISO timestamp format: ${isoTimestamp}`);
      }

      // Load current stored timestamp
      const storedTimestamp = await this.storage.getItem<number>(this.storageKeys.getLastFetchMissedMessages());

      // If PostHog timestamp is newer, trigger fetch
      if (!storedTimestamp || posthogTimestamp > storedTimestamp) {
        this.logger.info(
          `PubNubPollingProvider: PostHog timestamp (${posthogTimestamp}) is newer than stored (${
            storedTimestamp ?? 'none'
          }), triggering fetch`
        );
        // Fire and forget. We don't need to wait for the actual fetch to complete
        this.fetchMissedMessages();
      } else {
        this.logger.info(
          `PubNubPollingProvider: PostHog timestamp (${posthogTimestamp}) is not newer than stored (${storedTimestamp}), skipping fetch`
        );
      }
    } catch (error) {
      this.logger.error(
        'PubNubPollingProvider: Failed to update latest message timestamp',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Unsubscribes from a topic (channel).
   * Updates the topic's subscription status and notifies listeners.
   *
   * @param topicId - The ID of the topic to unsubscribe from
   * @returns Promise that resolves when the unsubscription is confirmed
   */
  async unsubscribe(topicId: Topic['id']): Promise<void> {
    for (const topic of this.topics) if (topic.id === topicId) topic.isSubscribed = false;
    this.onTopics(this.topics);
  }
}
