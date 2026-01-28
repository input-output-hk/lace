import { getCurrentTimetoken, getNow, isArrayOfStrings, unused } from '../../utils';
import { Notification, NotificationsLogger, NotificationsStorage, Topic } from '../../types';
import { NotificationsProvider, ProviderInitOptions } from '../types';
import PubNub from 'pubnub';
import { ConnectionStatus } from '../../ConnectionStatus';
import { TokenManager } from './TokenManager';
import { PubNubFunctionClient } from './PubnubFunctionClient';
import { StorageKeys } from '../../StorageKeys';
import { CachedTopics, ChannelsControlMessage, ChannelsControlMessagePUT, PubNubProviderOptions } from './types';
import { withNetworkErrorHandling } from './transformNetworkError';

const CHANNELS_CONTROL_CHANNEL = 'control.topics';

/**
 * Interval in milliseconds to refresh channels.
 */
// eslint-disable-next-line no-magic-numbers
const REFRESH_CHANNEL_INTERVAL = 1000 * 60 * 60 * 24; // 1 day in milliseconds

/**
 * Checks if a channel ID is a control channel.
 * Control channels start with 'control.' prefix.
 *
 * @param channelId - The channel ID to check
 * @returns True if the channel is a control channel, false otherwise
 */
const isControlChannel = (channelId: string): boolean => channelId.startsWith('control.');

/**
 * Represents a pending subscription or unsubscription action.
 */
interface PendingAction {
  /** Callback to resolve the pending action. */
  resolve: () => void;
  /** Callback to reject the pending action with an error. */
  reject: (reason: unknown) => void;
}

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
export class PubNubProvider implements NotificationsProvider {
  private config: PubNub.PubNubConfiguration;
  private closeResolve: (() => void) | undefined = undefined;
  private logger: NotificationsLogger;
  private onNotification: (notification: Notification) => void = unused;
  private onTopics: (topics: Topic[]) => void = unused;
  private pendingSubscriptions: Map<Topic['id'], PendingAction> = new Map();
  private pendingUnsubscriptions: Map<Topic['id'], PendingAction> = new Map();
  private pubnub: PubNub;
  private refreshChannelsInterval: NodeJS.Timeout | undefined = undefined;
  private refreshChannelsTimeout: NodeJS.Timeout | undefined = undefined;
  private refreshTokenTimeout: NodeJS.Timeout | undefined = undefined;
  private skipAuthentication?: boolean;
  private storage: NotificationsStorage;
  private storageKeys: StorageKeys;
  private tokenEndpoint: string;
  private topics: Topic[] = [];

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
    // Log which endpoint is being used
    this.logger.info(`PubNubProvider: Using token endpoint: ${this.tokenEndpoint}`);
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
    this.pubnub.addListener({
      message: (messageEvent) => {
        connectionStatus.setOk();

        const { channel, message, timetoken } = messageEvent;

        if (isControlChannel(channel)) {
          if (channel === CHANNELS_CONTROL_CHANNEL)
            this.handleChannelsControl(message as unknown as ChannelsControlMessage);
        } else
          this.processNotification(channel, message, timetoken).catch((error) =>
            this.logger.error('NotificationsClient:PubNubProvider: Failed to process notification', error)
          );
      },
      // eslint-disable-next-line sonarjs/cognitive-complexity, max-statements, complexity
      status: (statusEvent) => {
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

          for (const { reject } of this.pendingSubscriptions.values()) reject(error);
          for (const { reject } of this.pendingUnsubscriptions.values()) reject(error);
          this.pendingSubscriptions.clear();
          this.pendingUnsubscriptions.clear();

          connectionStatus.setError(error);

          return;
        }

        if (operation === 'PNSubscribeOperation') {
          const { affectedChannels } = statusEvent;

          if (isArrayOfStrings(affectedChannels)) {
            for (const channelId of affectedChannels) {
              const pendingSubscription = this.pendingSubscriptions.get(channelId);

              if (pendingSubscription) {
                pendingSubscription.resolve();
                this.pendingSubscriptions.delete(channelId);
              }
            }

            connectionStatus.setOk();

            return;
          }

          this.logger.warn('NotificationsClient:PubNubProvider: Got an unexpected affected channels', affectedChannels);
        } else if (operation === 'PNUnsubscribeOperation') {
          const { affectedChannels } = statusEvent;

          if (isArrayOfStrings(affectedChannels)) {
            if (affectedChannels.includes(CHANNELS_CONTROL_CHANNEL)) {
              if (this.closeResolve) {
                this.pubnub.stop();
                this.closeResolve();

                return;
              }

              this.logger.warn(
                'NotificationsClient:PubNubProvider: Got unexpected unsubscription from control.topics channel'
              );
            } else {
              for (const channelId of affectedChannels) {
                const pendingUnsubscription = this.pendingUnsubscriptions.get(channelId);

                // eslint-disable-next-line max-depth
                if (pendingUnsubscription) {
                  pendingUnsubscription.resolve();
                  this.pendingUnsubscriptions.delete(channelId);
                }
              }

              connectionStatus.setOk();

              return;
            }
          }

          this.logger.warn('NotificationsClient:PubNubProvider: Got an unexpected affected channels', affectedChannels);
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
    return new Promise<void>((resolve) => {
      if (this.refreshChannelsInterval) clearInterval(this.refreshChannelsInterval);
      if (this.refreshChannelsTimeout) clearTimeout(this.refreshChannelsTimeout);
      if (this.refreshTokenTimeout) clearTimeout(this.refreshTokenTimeout);

      this.closeResolve = resolve;
      this.pubnub.unsubscribeAll();
    });
  }

  /**
   * Fetches missed messages for subscribed topics.
   * Retrieves messages that arrived while the client was offline or disconnected.
   * Processes messages for topics that are either currently subscribed or were previously subscribed
   * (stored in subscribedTopics). Uses the last sync timestamp to fetch only new messages.
   *
   * @returns Promise that resolves when all missed messages have been fetched and processed
   */
  private async fetchMissedMessages(): Promise<void> {
    const subscribedTopics = (await this.storage.getItem<Topic['id'][]>(this.storageKeys.getSubscribedTopics())) || [];

    for (const topic of this.topics)
      if (topic.isSubscribed || subscribedTopics.includes(topic.id)) {
        const end = (await this.storage.getItem<string>(this.storageKeys.getLastSync(topic.id))) || '0';
        const response = await withNetworkErrorHandling(() =>
          this.pubnub.fetchMessages({ channels: [topic.id], count: 100, end })
        );
        const messages = response.channels[topic.id];

        if (messages)
          for (const { channel, message, timetoken } of messages)
            await this.processNotification(channel, message, timetoken.toString());
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
   * Handles control channel messages for topic management.
   * Supports DEL (delete) and PUT (add/update) actions.
   *
   * @param message - The control message containing action and topic information
   */
  private handleChannelsControl(message: ChannelsControlMessage): void {
    const { action, topicId } = message;
    const index = this.topics.findIndex((topic) => topic.id === topicId);

    if (action === 'DEL') {
      if (index === -1) {
        this.logger.warn('NotificationsClient:PubNubProvider: Topic not found', topicId, message);

        return;
      }

      this.topics.splice(index, 1);
    } else if (action === 'PUT') {
      const topic = {
        id: topicId,
        isSubscribed: index === -1 ? false : this.topics[index].isSubscribed,
        ...(message as ChannelsControlMessagePUT).details
      } as Topic;

      if (index === -1) this.topics.push(topic);
      else this.topics[index] = topic;
    } else {
      this.logger.warn('NotificationsClient:PubNubProvider: Invalid action', action, message);

      return;
    }

    this.onTopics(this.topics);
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
      this.onTopics((this.topics = cachedTopics.topics));

      this.refreshChannelsTimeout = setTimeout(
        this.refreshChannels.bind(this),
        REFRESH_CHANNEL_INTERVAL - (Date.now() - cachedTopics.lastFetch)
      );
    }

    this.fetchMissedMessages().catch((error) =>
      this.logger.error('NotificationsClient:PubNubProvider: Failed to fetch missed messages', error)
    );

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
  subscribe(topicId: Topic['id']): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      for (const topic of this.topics) if (topic.id === topicId) topic.isSubscribed = true;

      this.onTopics(this.topics);
      this.pubnub.subscribe({ channels: [topicId], timetoken: getCurrentTimetoken() });
      this.pendingSubscriptions.set(topicId, { resolve, reject });
    });
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
        if (JSON.stringify(topics) !== JSON.stringify(this.topics)) this.onTopics((this.topics = topics));
      })
      .catch((error) => this.logger.error('NotificationsClient:PubNubProvider: Failed to refresh channels', error));
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
    return new Promise<void>((resolve, reject) => {
      for (const topic of this.topics) if (topic.id === topicId) topic.isSubscribed = false;

      this.onTopics(this.topics);
      this.pubnub.unsubscribe({ channels: [topicId] });
      this.pendingUnsubscriptions.set(topicId, { resolve, reject });
    });
  }
}
