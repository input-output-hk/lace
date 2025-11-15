import { isArrayOfStrings, unused } from '../../utils';
import { Notification, NotificationsLogger, NotificationsStorage, Topic } from '../../types';
import { NotificationsProvider, ProviderInitOptions } from '../types';
import PubNub from 'pubnub';
import { ConnectionStatus } from '../../ConnectionStatus';
import { TokenManager } from './TokenManager';
import { PubNubFunctionClient } from './pubnub-function-client';
import { StorageKeys } from '../../StorageKeys';

const CHANNELS_CONTROL_CHANNEL = 'control.topics';

/**
 * Checks if a channel ID is a control channel.
 * Control channels start with 'control.' prefix.
 *
 * @param channelId - The channel ID to check
 * @returns True if the channel is a control channel, false otherwise
 */
const isControlChannel = (channelId: string): boolean => channelId.startsWith('control.');

/**
 * Configuration options for PubNub provider.
 */
export interface PubNubProviderConfiguration {
  /** Heartbeat interval in seconds. Defaults to 15. */
  heartbeatInterval?: number;
  /** Test only! Whether to skip authentication. If true, no auth token will be requested. */
  skipAuthentication?: boolean;
  /** PubNub subscribe key for the application. */
  subscribeKey?: string;
  /** PubNub auth endpoint for token requests. */
  tokenEndpoint?: string;
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
 * Union type for all control channel messages.
 */
export type ChannelsControlMessage = ChannelsControlMessageDEL | ChannelsControlMessagePUT;

/**
 * Represents a pending subscription or unsubscription action.
 */
interface PendingAction {
  /** Callback to resolve the pending action. */
  resolve: () => void;
  /** Callback to reject the pending action with an error. */
  reject: (reason: unknown) => void;
}

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

  let autoSubscribe = false;
  let chain = '';
  let name = '';

  if (typeof channelName === 'string') name = channelName;
  else
    logger.warn(
      'NotificationsClient:PubNubProvider: Got a channel with an invalid name: using empty name instead',
      channel
    );

  if (typeof custom === 'object') {
    const { autoSubscribe: customAutoSubscribe, chain: customChain } = {
      autoSubscribe: false,
      chain: '',
      ...custom
    };

    if ([false, true, undefined].includes(customAutoSubscribe)) autoSubscribe = customAutoSubscribe === true;
    else
      logger.warn(
        'NotificationsClient:PubNubProvider: Got a channel with an invalid autoSubscribe: using false instead',
        channel
      );

    if (typeof customChain === 'string') chain = customChain;
    else
      logger.warn(
        'NotificationsClient:PubNubProvider: Got a channel with an invalid chain: using empty chain instead',
        channel
      );
  } else if (custom !== null)
    logger.warn("NotificationsClient:PubNubProvider: Got a channel with invalid custom: can't set them", channel);

  return { autoSubscribe, chain, id, isSubscribed: false, name };
};

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
      heartbeatInterval: 15,
      // TODO: Replace with production subscribe key once available
      subscribeKey: 'production subscribe key',
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
   * Adds PubNub event listeners for messages and status events.
   * Handles message routing, control channel messages, and connection status updates.
   *
   * @param connectionStatus - Connection status manager for reporting status changes
   */
  private addListeners(connectionStatus: ConnectionStatus): void {
    this.pubnub.addListener({
      message: (messageEvent) => {
        connectionStatus.setOk();

        const { channel, message } = messageEvent;

        if (isControlChannel(channel)) {
          if (channel === CHANNELS_CONTROL_CHANNEL)
            this.handleChannelsControl(message as unknown as ChannelsControlMessage);
        } else if (this.topics.some(({ id, isSubscribed }) => id === channel && isSubscribed))
          this.onNotification(message as unknown as Notification);
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
        if (
          category === 'PNBadRequestCategory' &&
          'errorData' in statusEvent &&
          // eslint-disable-next-line unicorn/consistent-destructuring
          statusEvent.errorData instanceof TypeError &&
          // eslint-disable-next-line unicorn/consistent-destructuring
          statusEvent.errorData.message === 'node_fetch_1.AbortError is not a constructor'
        )
          return;

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
      this.closeResolve = resolve;
      this.pubnub.unsubscribeAll();
    });
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

    const { data: channels } = await this.pubnub.objects.getAllChannelMetadata({
      include: { customFields: true }
    });

    return (this.topics = channels
      .map((channel) => mapChannelToTopic(channel, this.pubnub, this.logger))
      .filter((topic): topic is Topic => topic !== undefined));
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
      this.pubnub.subscribe({ channels: [topicId] });
      this.pendingSubscriptions.set(topicId, { resolve, reject });
    });
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
