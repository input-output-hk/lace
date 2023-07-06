import { Wallet } from '@lace/cardano';
import { PostHogConfig } from 'posthog-js';

export const POSTHOG_ENABLED = process.env.USE_POSTHOG_ANALYTICS === 'true';
export const PUBLIC_POSTHOG_HOST = process.env.PUBLIC_POSTHOG_HOST;
export const PRODUCTION_TRACKING_MODE_ENABLED = process.env.PRODUCTION_MODE_TRACKING === 'true';

export const DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP: Record<Wallet.Cardano.NetworkMagic, string> = {
  [Wallet.Cardano.NetworkMagics.Mainnet]: 'phc_gH96Lx5lEVXTTWEyytSdTFPDk3Xsxwi4BqG88mKObd1',
  [Wallet.Cardano.NetworkMagics.Preprod]: 'phc_Xlmldm6EYSfQVgB9Uxm3b2xC1noDlgFFXpF9AJ6SMfJ',
  [Wallet.Cardano.NetworkMagics.Preview]: 'phc_e8SaOOWpXpNE59TnpLumeUjWm4iv024AWjhQqU406jr'
};

export const PRODUCTION_NETWORK_ID_TO_POSTHOG_TOKEN_MAP: Record<Wallet.Cardano.NetworkMagic, string> = {
  // TODO: add the correct project token
  [Wallet.Cardano.NetworkMagics.Mainnet]: '1',
  [Wallet.Cardano.NetworkMagics.Preprod]: '2',
  [Wallet.Cardano.NetworkMagics.Preview]: '3'
};

type PersistenceConfig = Pick<PostHogConfig, 'disable_persistence' | 'disable_cookie' | 'persistence'>;

/* eslint-disable camelcase */
export const BASIC_ANALYTICS_CONFIG: PersistenceConfig = {
  disable_persistence: true,
  disable_cookie: true,
  persistence: 'memory'
};
export const ENHANCED_ANALYTICS_CONFIG: PersistenceConfig = {
  disable_persistence: false,
  disable_cookie: false,
  persistence: 'localStorage'
};
/* eslint-enable camelcase */
