import { Wallet } from '@lace/cardano';

export const POSTHOG_ENABLED = process.env.USE_POSTHOG_ANALYTICS === 'true';
export const POSTHOG_OPTED_OUT_EVENTS_DISABLED = process.env.USE_POSTHOG_ANALYTICS_FOR_OPTED_OUT === 'false';
export const POSTHOG_HOST = process.env.POSTHOG_HOST;
export const PRODUCTION_TRACKING_MODE_ENABLED = process.env.PRODUCTION_MODE_TRACKING === 'true';
export const POSTHOG_EXCLUDED_EVENTS = process.env.POSTHOG_EXCLUDED_EVENTS ?? '';

export const DEV_POSTHOG_TOKEN = process.env.POSTHOG_DEV_TOKEN;
export const PRODUCTION_POSTHOG_TOKEN = process.env.POSTHOG_PRODUCTION_TOKEN;

export const DEV_POSTHOG_PROJECT_ID = 6315;
export const PRODUCTION_POSTHOG_PROJECT_ID = 6621;

export const NETWORK_NAME_TO_NETWORK_MAGIC: Record<string, Wallet.Cardano.NetworkMagic> = {
  mainnet: Wallet.Cardano.NetworkMagics.Mainnet,
  preprod: Wallet.Cardano.NetworkMagics.Preprod,
  preview: Wallet.Cardano.NetworkMagics.Preview,
  sanchonet: Wallet.Cardano.NetworkMagics.Sanchonet
};

export const NETWORK_MAGIC_TO_NETWORK_NAME: Record<Wallet.Cardano.NetworkMagic, string> = {
  [Wallet.Cardano.NetworkMagics.Mainnet]: 'mainnet',
  [Wallet.Cardano.NetworkMagics.Preprod]: 'preprod',
  [Wallet.Cardano.NetworkMagics.Preview]: 'preview',
  [Wallet.Cardano.NetworkMagics.Sanchonet]: 'sanchonet'
};
