import { Wallet } from '@lace/cardano';
import { PostHogConfig } from 'posthog-js';

export const POSTHOG_ENABLED = process.env.USE_POSTHOG_ANALYTICS === 'true';
export const PUBLIC_POSTHOG_HOST = process.env.PUBLIC_POSTHOG_HOST;

// these should map to the project public key in PostHog
export const NETWORK_ID_TO_POSTHOG_TOKEN_MAP: Record<Wallet.Cardano.NetworkId, string> = {
  [Wallet.Cardano.NetworkId.Mainnet]: 'phc_e8SaOOWpXpNE59TnpLumeUjWm4iv024AWjhQqU406jr',
  [Wallet.Cardano.NetworkId.Testnet]: 'phc_e8SaOOWpXpNE59TnpLumeUjWm4iv024AWjhQqU406jr'
};

type PersistenceConfig = Pick<PostHogConfig, 'disable_persistence' | 'disable_cookie' | 'persistence'>;

/* eslint-disable camelcase */
export const BASIC_TRACKING_CONFIG: PersistenceConfig = {
  disable_persistence: true,
  disable_cookie: true,
  persistence: 'memory'
};
export const ENHANCED_TRACKING_CONFIG: PersistenceConfig = {
  disable_persistence: false,
  disable_cookie: false,
  persistence: 'localStorage'
};
/* eslint-enable camelcase */
