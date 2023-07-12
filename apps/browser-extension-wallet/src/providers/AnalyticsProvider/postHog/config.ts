import { Wallet } from '@lace/cardano';

export const POSTHOG_ENABLED = process.env.USE_POSTHOG_ANALYTICS === 'true';
export const PUBLIC_POSTHOG_HOST = process.env.PUBLIC_POSTHOG_HOST;

export const NETWORK_ID_TO_POSTHOG_TOKEN_MAP: Record<Wallet.Cardano.NetworkMagic, string> = {
  [Wallet.Cardano.NetworkMagics.Mainnet]: 'phc_gH96Lx5lEVXTTWEyytSdTFPDk3Xsxwi4BqG88mKObd1',
  [Wallet.Cardano.NetworkMagics.Preprod]: 'phc_Xlmldm6EYSfQVgB9Uxm3b2xC1noDlgFFXpF9AJ6SMfJ',
  [Wallet.Cardano.NetworkMagics.Preview]: 'phc_e8SaOOWpXpNE59TnpLumeUjWm4iv024AWjhQqU406jr'
};
