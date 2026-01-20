import { getNow, unused } from '../../utils';
import { Notification, NotificationsLogger, NotificationsStorage, Topic } from '../../types';
import { NotificationsProvider, ProviderInitOptions } from '../types';
import PubNub from 'pubnub';
import { ConnectionStatus } from '../../ConnectionStatus';
import { TokenManager } from './TokenManager';
import { PubNubFunctionClient } from './PubnubFunctionClient';
import { StorageKeys } from '../../StorageKeys';
import { CachedTopics, PubNubProviderOptions } from './types';
import { withNetworkErrorHandling } from './transformNetworkError';

/**
 * Conversion factor: seconds per minute.
 */
// eslint-disable-next-line no-magic-numbers
const SECONDS_PER_MINUTE = 60;

/**
 * Conversion factor: milliseconds per second.
 */
// eslint-disable-next-line no-magic-numbers
const MILLISECONDS_PER_SECOND = 1000;

/**
 * Interval in milliseconds to refresh channels.
 */
// eslint-disable-next-line no-magic-numbers
const REFRESH_CHANNEL_INTERVAL = MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE * 60 * 24; // 1 day in milliseconds

/**
 * Default interval in minutes to fetch missed messages.
 */
// eslint-disable-next-line no-magic-numbers
const DEFAULT_FETCH_MISSED_MESSAGES_INTERVAL_MINUTES = 6 * 60; // 6h in minutes

/**
 * Converts minutes to milliseconds.
 *
 * @param minutes - Interval in minutes
 * @returns Interval in milliseconds
 */
const minutesToMilliseconds = (minutes: number): number => minutes * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

/**
 * Checks if a channel ID is a control channel.
 * Control channels start with 'control.' prefix.
 *
 * @param channelId - The channel ID to check
 * @returns True if the channel is a control channel, false otherwise
 */
const isControlChannel = (channelId: string): boolean => channelId.startsWith('control.');

const ignoredErrors = new Set(['node_fetch_1.AbortError is not a constructor', 'U.AbortError is not a constructor']);

const mapChannelCustomData = (
  custom: PubNub.AppContext.CustomData | null,
  channelName: string,
  logger: NotificationsLogger
): { autoSubscribe: boolean; chain: string; publisher: string } => {
  let autoSubscribe = false;
  let chain = '';
  let publisher = channelName;

  if (typeof custom === 'object') {
    const {
      autoSubscribe: customAutoSubscribe,
      chain: customChain,
      publisher: customPublisher
    } = {
      autoSubscribe,
      chain,
      publisher,
      ...custom
    };

    if ([false, true, undefined].includes(customAutoSubscribe)) autoSubscribe = customAutoSubscribe === true;
    else
      logger.warn(
        'NotificationsClient:PubNubProvider: Got a channel with an invalid autoSubscribe: using false instead',
        custom
      );

    if (typeof customChain === 'string') chain = customChain;
    else
      logger.warn(
        'NotificationsClient:PubNubProvider: Got a channel with an invalid chain: using empty chain instead',
        custom
      );

    if (typeof customPublisher === 'string') publisher = customPublisher;
    else
      logger.warn(
        'NotificationsClient:PubNubProvider: Got a channel with an invalid publisher: using channel name as publisher instead',
        custom,
        channelName
      );
  } else if (custom !== null)
    logger.warn("NotificationsClient:PubNubProvider: Got a channel with invalid custom: can't set them", custom);

  return { autoSubscribe, chain, publisher };
};

/**
 * Maps a PubNub channel metadata object to a Topic.
 * Handles validation, control channels, and extracts custom properties.
 *
 * @param channel - The PubNub channel metadata object
 * @param pubnub - The PubNub instance for subscribing to control channels
 * @param logger - Logger instance for warning messages
 * @returns A Topic object if valid, undefined otherwise
 */
const mapChannelToTopic = (
  channel: PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>,
  pubnub: PubNub,
  logger: NotificationsLogger
): Topic | undefined => {
  const warn = (...args: unknown[]): undefined => {
    logger.warn(...args);

    return undefined;
  };

  if (typeof channel !== 'object' || channel === null)
    return warn('NotificationsClient:PubNubProvider: Got an invalid channel: omitting it', channel);

  const { custom, id, name: channelName } = { custom: {}, ...channel };

  if (typeof id !== 'string')
    return warn('NotificationsClient:PubNubProvider: Got a channel with an invalid ID: omitting it', channel);

  if (isControlChannel(id)) {
    pubnub.subscribe({ channels: [id] });

    // eslint-disable-next-line consistent-return
    return;
  }

  let name = '';

  if (typeof channelName === 'string') name = channelName;
  else
    logger.warn(
      'NotificationsClient:PubNubProvider: Got a channel with an invalid name: using empty name instead',
      channel
    );

  const { autoSubscribe, chain, publisher } = mapChannelCustomData(custom, name, logger);

  return { autoSubscribe, chain, id, isSubscribed: false, name, publisher };
};

/**
 * Converts an array of PubNub channel metadata objects to an array of Topic objects.
 * Filters out invalid channels and control channels.
 *
 * @param channels - Array of PubNub channel metadata objects
 * @param pubnub - The PubNub instance for subscribing to control channels
 * @param logger - Logger instance for warning messages
 * @returns Array of valid Topic objects
 */
const channelsToTopics = (
  channels: PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>[],
  pubnub: PubNub,
  logger: NotificationsLogger
): Topic[] =>
  channels
    .map((channel) => mapChannelToTopic(channel, pubnub, logger))
    .filter((topic): topic is Topic => topic !== undefined);

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
  private fetchMissedMessagesIntervalMinutes: number;
  private fetchMissedMessagesTimeout: NodeJS.Timeout | undefined = undefined;
  private refreshChannelsInterval: NodeJS.Timeout | undefined = undefined;
  private refreshChannelsTimeout: NodeJS.Timeout | undefined = undefined;
  private refreshTokenTimeout: NodeJS.Timeout | undefined = undefined;
  private readonly skipAuthentication?: boolean;
  private readonly storage: NotificationsStorage;
  private readonly storageKeys: StorageKeys;
  private readonly tokenEndpoint: string;
  private topics: Topic[] = [];
  private isClosed = false;

  /**
   * Creates a new PubNubProvider instance.
   *
   * @param options - Configuration options for the provider
   */
  constructor(options: PubNubProviderOptions) {
    const {
      heartbeatInterval,
      logger,
      skipAuthentication,
      storage,
      storageKeys,
      subscribeKey,
      fetchMissedMessagesIntervalMinutes
    } = {
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
    // Log which endpoint is being used
    this.logger.info(`PubNubPollingProvider: Using token endpoint: ${this.tokenEndpoint}`);
    this.fetchMissedMessagesIntervalMinutes =
      fetchMissedMessagesIntervalMinutes ?? DEFAULT_FETCH_MISSED_MESSAGES_INTERVAL_MINUTES;
    this.config = {
      // authKey,
      autoNetworkDetection: true,
      heartbeatInterval,
      restore: true,
      subscribeKey
    };
  }

  /**
   * Adds PubNub event listeners for messages and status events.
   * Handles message routing, control channel messages, and connection status updates.
   *
   * @param connectionStatus - Connection status manager for reporting status changes
   */
  private addListeners(connectionStatus: ConnectionStatus): void {
    // No events were received during tests of the polling mode. This whole section is probably not needed.
    this.pubnub.addListener({
      // eslint-disable-next-line sonarjs/cognitive-complexity, max-statements, complexity
      status: (statusEvent) => {
        this.logger.info('[DEBUG] PubNubPollingProvider: statusEvent', statusEvent);
        const { category, operation } = statusEvent;

        if (operation === 'PNHeartbeatOperation') return;

        // Nothing to do as this happens after errors
        if (category === 'PNNetworkDownCategory') return;

        if (category === 'PNNetworkUpCategory') {
          connectionStatus.setOk();

          return;
        }

        // Nothing to do as this happens after PNNetworkUpCategory
        if (category === 'PNReconnectedCategory') return;

        // Not severe error on heartbeat which can be ignored as it happens only once
        if ('errorData' in statusEvent) {
          const { errorData } = statusEvent;

          if (errorData instanceof Error && ignoredErrors.has(errorData.message)) return;
        }

        if (category === 'PNNetworkIssuesCategory') {
          const { errorData } = statusEvent as unknown as { errorData: unknown };
          const error = errorData instanceof Error ? errorData : new Error(JSON.stringify(errorData));

          connectionStatus.setError(error);

          return;
        }

        this.logger.warn('NotificationsClient:PubNubProvider: Unhandled status event', statusEvent);
      }
    });
  }

  /**
   * Closes the PubNub connection and unsubscribes from all channels.
   * Returns a promise that resolves when the connection is fully closed.
   *
   * @returns Promise that resolves when the connection is closed
   */
  async close(): Promise<void> {
    this.isClosed = true;
    if (this.fetchMissedMessagesTimeout) clearTimeout(this.fetchMissedMessagesTimeout);
    if (this.refreshChannelsInterval) clearInterval(this.refreshChannelsInterval);
    if (this.refreshChannelsTimeout) clearTimeout(this.refreshChannelsTimeout);
    if (this.refreshTokenTimeout) clearTimeout(this.refreshTokenTimeout);
    this.pubnub.destroy();
  }

  /**
   * Calculates the time until the next fetch should occur.
   * Returns 0 if lastFetchMissedMessages doesn't exist (fetch immediately).
   * Otherwise calculates the remaining time until the next interval.
   *
   * @returns Promise that resolves to the time in milliseconds until next fetch (0 means fetch immediately)
   */
  private async calculateNextFetchTime(): Promise<number> {
    const lastFetchMissedMessages = await this.storage.getItem<number>(this.storageKeys.getLastFetchMissedMessages());

    if (!lastFetchMissedMessages) return 0;

    const intervalMs = minutesToMilliseconds(this.fetchMissedMessagesIntervalMinutes);
    const timeSinceLastFetch = Date.now() - lastFetchMissedMessages;

    return Math.max(0, intervalMs - timeSinceLastFetch);
  }

  /**
   * Schedules the next fetchMissedMessages call.
   * Always uses setTimeout to ensure asynchronous execution, even when timeUntilNext is 0.
   * This prevents potential synchronous recursion when called from within fetchMissedMessages.
   *
   * @param timeUntilNext - Time in milliseconds until next fetch (0 means schedule immediately but asynchronously)
   */
  private scheduleNextFetch(timeUntilNext: number): void {
    if (this.isClosed || this.fetchMissedMessagesTimeout) {
      // adready scheduled or closed, do nothing
      return;
    }
    // Schedule fetch for the calculated time
    this.fetchMissedMessagesTimeout = setTimeout(() => {
      this.fetchMissedMessages();
    }, timeUntilNext);
  }

  /**
   * Fetches and processes missed messages for a single topic.
   *
   * @param topic - The topic to fetch messages for
   * @returns Promise that resolves when messages are fetched and processed
   */
  private async fetchMessagesForTopic(topic: Topic): Promise<void> {
    const end = (await this.storage.getItem<string>(this.storageKeys.getLastSync(topic.id))) || '0';
    const response = await withNetworkErrorHandling(() =>
      this.pubnub.fetchMessages({ channels: [topic.id], count: 100, end })
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
   * Always reschedules the next fetch in the finally block, regardless of success or failure.
   *
   * @returns Promise that resolves when all missed messages have been fetched and processed
   */
  private async fetchMissedMessages(): Promise<void> {
    await this.storage.setItem(this.storageKeys.getLastFetchMissedMessages(), Date.now());
    try {
      const subscribedTopics =
        (await this.storage.getItem<Topic['id'][]>(this.storageKeys.getSubscribedTopics())) || [];

      for (const topic of this.topics) {
        if (topic.isSubscribed || subscribedTopics.includes(topic.id)) {
          await this.fetchMessagesForTopic(topic);
        }
      }
    } catch (error) {
      this.logger.error(
        'NotificationsClient:PubNubProvider: Failed to fetch missed messages',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      // Always reschedule the next fetch, regardless of success or failure
      // This ensures periodic fetching continues even after errors
      if (this.fetchMissedMessagesTimeout) {
        clearTimeout(this.fetchMissedMessagesTimeout);
        this.fetchMissedMessagesTimeout = undefined;
      }

      const timeUntilNext = await this.calculateNextFetchTime();
      this.scheduleNextFetch(timeUntilNext);
    }
  }

  /**
   * Retrieves the authentication key (token) for PubNub.
   * Creates a TokenManager instance and requests a valid token.
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

    const token = await tokenManager.getValidToken();

    this.refreshTokenTimeout = setTimeout(
      this.refreshToken.bind(this, userId),
      // eslint-disable-next-line no-magic-numbers
      (token.expiresAt - getNow() - 60) * 1000 // 60 seconds before expiry
    );

    return token.token;
  }

  /**
   * Initializes the PubNub provider.
   * Sets up authentication, listeners, and retrieves all available topics.
   *
   * @param options - Initialization options including callbacks and connection status
   * @returns Promise that resolves to an array of available topics
   */
  async init(options: ProviderInitOptions): Promise<Topic[]> {
    const { connectionStatus, onNotification, onTopics, userId } = options;
    const authKey = this.skipAuthentication ? undefined : await this.getAuthKey(userId);

    this.pubnub = new PubNub({ ...this.config, authKey, userId });
    this.onNotification = onNotification;
    this.onTopics = onTopics;
    this.addListeners(connectionStatus);

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

    // Calculate when the next fetch should occur and schedule it
    const timeUntilNext = await this.calculateNextFetchTime();
    this.scheduleNextFetch(timeUntilNext);

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
    const { data: channels } = await withNetworkErrorHandling(() =>
      this.pubnub.objects.getAllChannelMetadata({ include: { customFields: true } })
    );
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
   * Updates the interval for fetching missed messages.
   * Recalculates the next fetch time based on the new interval and reschedules the timeout.
   *
   * @param intervalMinutes - New interval in minutes
   */
  updateFetchMissedMessagesInterval(intervalMinutes: number): void {
    // Clear existing timeout
    if (this.fetchMissedMessagesTimeout) {
      clearTimeout(this.fetchMissedMessagesTimeout);
      this.fetchMissedMessagesTimeout = undefined;
    }

    // Update the interval
    this.fetchMissedMessagesIntervalMinutes = intervalMinutes;

    // Recalculate next fetch time with new interval and reschedule
    void (async () => {
      if (this.isClosed) {
        return;
      }
      const timeUntilNext = await this.calculateNextFetchTime();
      const intervalMs = minutesToMilliseconds(intervalMinutes);

      this.logger.info(
        `PubNubPollingProvider: Updated interval to ${intervalMinutes} minutes (${intervalMs}ms), next fetch in ${timeUntilNext}ms`
      );

      this.scheduleNextFetch(timeUntilNext);
    })();
  }

  private refreshToken(userId: string): void {
    let nextCallIn = 1000;
    this.refreshTokenTimeout = undefined;

    void (async () => {
      const tokenManager = new TokenManager(
        new PubNubFunctionClient(this.tokenEndpoint),
        this.storage,
        this.storageKeys,
        userId
      );

      const token = await tokenManager.getValidToken(true);

      this.pubnub.setToken(token.token);

      // eslint-disable-next-line no-magic-numbers
      nextCallIn = (token.expiresAt - getNow() - 60) * 1000; // 60 seconds before expiry
    })()
      .catch((error) => this.logger.error('NotificationsClient:PubNubProvider: Failed to refresh token', error))
      .finally(() => (this.refreshTokenTimeout = setTimeout(this.refreshToken.bind(this, userId), nextCallIn)));
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
