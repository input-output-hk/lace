import PubNub from 'pubnub';
import { catchError, from, map, Observable } from 'rxjs';
import { ErrorDiscriminator } from '../errors';
import { PubNubErrorDiscriminator } from './PubNubErrorDiscriminator';
import { NotificationsLogger, Topic } from '../types';

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
    else logger.warn('PubNubProvider: Got a channel with an invalid autoSubscribe: using false instead', custom);

    if (typeof customChain === 'string') chain = customChain;
    else logger.warn('PubNubProvider: Got a channel with an invalid chain: using empty chain instead', custom);

    if (typeof customPublisher === 'string') publisher = customPublisher;
    else
      logger.warn(
        'PubNubProvider: Got a channel with an invalid publisher: using channel name as publisher instead',
        custom,
        channelName
      );
  } else if (custom !== null) logger.warn("PubNubProvider: Got a channel with invalid custom: can't set them", custom);

  return { autoSubscribe, chain, publisher };
};

/**
 * Maps a PubNub channel metadata object to a Topic.
 * Handles validation and extracts custom properties.
 *
 * @param channel - The PubNub channel metadata object
 * @param logger - Logger instance for warning messages
 * @returns A Topic object if valid, undefined otherwise
 */
const mapChannelToTopic = (
  channel: PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>,
  logger: NotificationsLogger
): Topic | undefined => {
  const warn = (...args: unknown[]): undefined => {
    logger.warn(...args);

    return undefined;
  };

  if (typeof channel !== 'object' || channel === null)
    return warn('PubNubProvider: Got an invalid channel: omitting it', channel);

  const { custom, id, name: channelName } = { custom: {}, ...channel };

  if (typeof id !== 'string') return warn('PubNubProvider: Got a channel with an invalid ID: omitting it', channel);

  let name = '';

  if (typeof channelName === 'string') name = channelName;
  else logger.warn('PubNubProvider: Got a channel with an invalid name: using empty name instead', channel);

  const { autoSubscribe, chain, publisher } = mapChannelCustomData(custom, name, logger);

  return { autoSubscribe, chain, id, name, publisher };
};

/**
 * Converts an array of PubNub channel metadata objects to an array of Topic objects.
 * Filters out invalid channels and control channels.
 *
 * @param channels - Array of PubNub channel metadata objects
 * @param logger - Logger instance for warning messages
 * @returns Array of valid Topic objects
 */
const channelsToTopics = (
  channels: PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>[],
  logger: NotificationsLogger
): Topic[] =>
  channels.map((channel) => mapChannelToTopic(channel, logger)).filter((topic): topic is Topic => topic !== undefined);

/**
 * RxJS wrapper around PubNub SDK with error classification.
 * Converts PubNub SDK errors to typed errors (NetworkError, UnknownError).
 * Retry handling is done at the provider level.
 */
export class PubNubRxWrapper {
  constructor(
    private readonly pubnub: PubNub,
    private readonly errorClassifier: ErrorDiscriminator<unknown> = new PubNubErrorDiscriminator(),
    private readonly logger: NotificationsLogger
  ) {}

  /**
   * Fetches message history for specified channels (topics).
   * Wraps PubNub fetchMessages as an observable with error classification.
   *
   * @param channels - Array of channel names (topic IDs)
   * @param end - Ending timetoken (inclusive)
   * @returns Observable emitting PubNub fetch response
   * @throws {NetworkError} For network-related errors (timeout, connection issues)
   * @throws {UnknownError} For other errors
   */
  fetchHistory(channels: string[], end: string): Observable<PubNub.History.FetchMessagesResponse> {
    return from(
      this.pubnub.fetchMessages({
        channels,
        count: 100,
        end
      })
    ).pipe(catchError((error: unknown) => this.errorClassifier.throwForStatus(error)));
  }

  /**
   * Fetches all channel metadata (topics) from PubNub.
   * Wraps PubNub getAllChannelMetadata as an observable with error classification.
   *
   * @returns Observable emitting array of channel metadata objects
   * @throws {NetworkError} For network-related errors (timeout, connection issues)
   * @throws {UnknownError} For other errors
   */
  fetchTopics(): Observable<Topic[]> {
    return from(
      this.pubnub.objects.getAllChannelMetadata({
        include: {
          customFields: true
        }
      })
    ).pipe(
      map((response) => channelsToTopics(response.data, this.logger)),
      catchError((error: unknown) => this.errorClassifier.throwForStatus(error))
    );
  }
}
