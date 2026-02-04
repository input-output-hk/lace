import PubNub from 'pubnub';
import { NotificationsLogger } from '../types';
import { PubNubRxWrapper } from './PubNubRxWrapper';
import { PubNubErrorDiscriminator } from './PubNubErrorDiscriminator';

/**
 * Configuration for creating a PubNub wrapper.
 */
export interface CreatePubNubWrapperConfig {
  /** PubNub subscribe key. */
  subscribeKey: string;
  /** User ID for PubNub client. */
  userId: string;
  /** Logger instance for logging. */
  logger: NotificationsLogger;
}

/**
 * Factory function to create a PubNub client and wrapper.
 * Creates PubNub client with standard configuration and wraps it in PubNubRxWrapper.
 *
 * @param config - Configuration for creating the wrapper
 * @returns Configured PubNubRxWrapper instance
 */
export const createPubNubWrapper = (config: CreatePubNubWrapperConfig): PubNubRxWrapper => {
  const pubnub = new PubNub({
    subscribeKey: config.subscribeKey,
    userId: config.userId,
    autoNetworkDetection: false,
    restore: false
  });

  return new PubNubRxWrapper(pubnub, new PubNubErrorDiscriminator(), config.logger);
};
