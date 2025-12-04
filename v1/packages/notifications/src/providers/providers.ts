import type { PubNubProviderConfiguration } from './PubNub/types';

/**
 * Array of available notification provider names.
 * This constant defines all supported notification providers in the system.
 */
export const NotificationsProviders = ['PubNub'] as const;

/**
 * Type representing the available notification provider names.
 * Derived from the NotificationsProviders constant array.
 */
// eslint-disable-next-line prettier/prettier
export type NotificationsProviders = (typeof NotificationsProviders)[number];

/**
 * Configuration options for PubNub notification provider.
 */
export interface NotificationsPubNubProviderOptions {
  /** Name of the provider. Must be 'PubNub'. */
  name: 'PubNub';
  /** Optional configuration for PubNub provider settings. */
  configuration?: PubNubProviderConfiguration;
}

/**
 * Union type representing all available notification provider options.
 * Currently supports PubNub provider.
 */
export type NotificationsProviderOptions = NotificationsPubNubProviderOptions;
