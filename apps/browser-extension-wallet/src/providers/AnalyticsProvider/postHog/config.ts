import { Wallet } from '@lace/cardano';

export const POSTHOG_ENABLED = process.env.USE_POSTHOG_ANALYTICS === 'true';
export const POSTHOG_OPTED_OUT_EVENTS_DISABLED = process.env.USE_POSTHOG_ANALYTICS_FOR_OPTED_OUT === 'false';
export const PUBLIC_POSTHOG_HOST = process.env.PUBLIC_POSTHOG_HOST;
export const PRODUCTION_TRACKING_MODE_ENABLED = process.env.PRODUCTION_MODE_TRACKING === 'true';
export const POSTHOG_EXCLUDED_EVENTS = process.env.POSTHOG_EXCLUDED_EVENTS ?? '';

export const DEV_NETWORK_ID_TO_POSTHOG_TOKEN_MAP: Record<Wallet.Cardano.NetworkMagic, string> = {
  [Wallet.Cardano.NetworkMagics.Mainnet]: 'phc_gH96Lx5lEVXTTWEyytSdTFPDk3Xsxwi4BqG88mKObd1',
  [Wallet.Cardano.NetworkMagics.Preprod]: 'phc_Xlmldm6EYSfQVgB9Uxm3b2xC1noDlgFFXpF9AJ6SMfJ',
  [Wallet.Cardano.NetworkMagics.Preview]: 'phc_e8SaOOWpXpNE59TnpLumeUjWm4iv024AWjhQqU406jr'
};

export const PRODUCTION_NETWORK_ID_TO_POSTHOG_TOKEN_MAP: Record<Wallet.Cardano.NetworkMagic, string> = {
  [Wallet.Cardano.NetworkMagics.Mainnet]: 'phc_dCx1iT3Ud5tGIRwGqEvpeddFmPcKDGxBzk6rPP58RFE',
  [Wallet.Cardano.NetworkMagics.Preprod]: 'phc_5sVVmLJ5x6IuipMBZwjudVk5bQcfcBSMjgEOe5gTOh0',
  [Wallet.Cardano.NetworkMagics.Preview]: 'phc_p7GeKELpQtkValRMvzUXX38TPGhKQYItO7aBRYJfvhW'
};

export const DEV_NETWORK_ID_TO_POSTHOG_PROJECT_ID_MAP: Record<Wallet.Cardano.NetworkMagic, number> = {
  [Wallet.Cardano.NetworkMagics.Mainnet]: 6315,
  [Wallet.Cardano.NetworkMagics.Preprod]: 6316,
  [Wallet.Cardano.NetworkMagics.Preview]: 4874
};

export const PRODUCTION_NETWORK_ID_TO_POSTHOG_PROJECT_ID_MAP: Record<Wallet.Cardano.NetworkMagic, number> = {
  [Wallet.Cardano.NetworkMagics.Mainnet]: 6621,
  [Wallet.Cardano.NetworkMagics.Preprod]: 6620,
  [Wallet.Cardano.NetworkMagics.Preview]: 6619
};
