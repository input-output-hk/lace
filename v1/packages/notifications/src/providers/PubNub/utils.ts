import PubNub from 'pubnub';
import { NotificationsLogger, Topic } from '../../types';
import type { RetryBackoffConfig } from 'backoff-rxjs';

/**
 * Conversion factor: seconds per minute.
 */
// eslint-disable-next-line no-magic-numbers
export const SECONDS_PER_MINUTE = 60;

/**
 * Conversion factor: milliseconds per second.
 */
// eslint-disable-next-line no-magic-numbers
export const MILLISECONDS_PER_SECOND = 1000;

/**
 * Interval in milliseconds to refresh channels.
 */
// eslint-disable-next-line no-magic-numbers
export const REFRESH_CHANNEL_INTERVAL = MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE * 60 * 24; // 1 day in milliseconds

/**
 * Maximum interval multiplier for token retry backoff.
 */
// eslint-disable-next-line no-magic-numbers
const MAX_RETRY_INTERVAL_MULTIPLIER = 16;

/**
 * Retry configuration for token retrieval using retryBackoff operator.
 * Implements exponential backoff: 1s, 2s, 4s, 8s, 16s (5 retries total).
 */
export const TOKEN_RETRY_CONFIG: RetryBackoffConfig = {
  initialInterval: MILLISECONDS_PER_SECOND, // Start with 1 second
  maxInterval: MILLISECONDS_PER_SECOND * MAX_RETRY_INTERVAL_MULTIPLIER, // Cap at 16 seconds
  maxRetries: 5 // Total of 6 attempts: 1 initial + 5 retries
};

/**
 * Checks if a channel ID is a control channel.
 * Control channels start with 'control.' prefix.
 *
 * @param channelId - The channel ID to check
 * @returns True if the channel is a control channel, false otherwise
 */
export const isControlChannel = (channelId: string): boolean => channelId.startsWith('control.');

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
export const channelsToTopics = (
  channels: PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>[],
  pubnub: PubNub,
  logger: NotificationsLogger
): Topic[] =>
  channels
    .map((channel) => mapChannelToTopic(channel, pubnub, logger))
    .filter((topic): topic is Topic => topic !== undefined);
