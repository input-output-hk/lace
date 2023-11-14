import { Wallet } from '@lace/cardano';

export const POSTHOG_ENABLED = process.env.USE_POSTHOG_ANALYTICS === 'true';
export const POSTHOG_OPTED_OUT_EVENTS_DISABLED = process.env.USE_POSTHOG_ANALYTICS_FOR_OPTED_OUT === 'false';
export const PUBLIC_POSTHOG_HOST = process.env.PUBLIC_POSTHOG_HOST;
export const PRODUCTION_TRACKING_MODE_ENABLED = process.env.PRODUCTION_MODE_TRACKING === 'true';
export const POSTHOG_EXCLUDED_EVENTS = process.env.POSTHOG_EXCLUDED_EVENTS ?? '';

export const DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP: Record<Wallet.Cardano.NetworkMagic, string> = {
  [Wallet.Cardano.NetworkMagics.Mainnet]: process.env.POSTHOG_DEV_TOKEN_MAINNET,
  [Wallet.Cardano.NetworkMagics.Preprod]: process.env.POSTHOG_DEV_TOKEN_PREPROD,
  [Wallet.Cardano.NetworkMagics.Preview]: process.env.POSTHOG_DEV_TOKEN_PREVIEW,
  [Wallet.Cardano.NetworkMagics.Sanchonet]: process.env.POSTHOG_DEV_TOKEN_SANCHONET
};

export const PRODUCTION_NETWORK_ID_TO_POSTHOG_TOKEN_MAP: Record<Wallet.Cardano.NetworkMagic, string> = {
  [Wallet.Cardano.NetworkMagics.Mainnet]: process.env.POSTHOG_PRODUCTION_TOKEN_MAINNET,
  [Wallet.Cardano.NetworkMagics.Preprod]: process.env.POSTHOG_PRODUCTION_TOKEN_PREPROD,
  [Wallet.Cardano.NetworkMagics.Preview]: process.env.POSTHOG_PRODUCTION_TOKEN_PREVIEW,
  [Wallet.Cardano.NetworkMagics.Sanchonet]: process.env.POSTHOG_PRODUCTION_TOKEN_SANCHONET
};

export const DEV_NETWORK_ID_TO_POSTHOG_PROJECT_ID_MAP: Record<Wallet.Cardano.NetworkMagic, number> = {
  [Wallet.Cardano.NetworkMagics.Mainnet]: 6315,
  [Wallet.Cardano.NetworkMagics.Preprod]: 6316,
  [Wallet.Cardano.NetworkMagics.Preview]: 4874,
  [Wallet.Cardano.NetworkMagics.Sanchonet]: 11_178
};

export const PRODUCTION_NETWORK_ID_TO_POSTHOG_PROJECT_ID_MAP: Record<Wallet.Cardano.NetworkMagic, number> = {
  [Wallet.Cardano.NetworkMagics.Mainnet]: 6621,
  [Wallet.Cardano.NetworkMagics.Preprod]: 6620,
  [Wallet.Cardano.NetworkMagics.Preview]: 6619,
  [Wallet.Cardano.NetworkMagics.Sanchonet]: 11_179
};
