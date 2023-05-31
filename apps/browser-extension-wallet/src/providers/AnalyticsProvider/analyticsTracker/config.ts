import { Wallet } from '@lace/cardano';

export const ANALYTICS_ACCEPTANCE_LS_KEY = 'analyticsAccepted';
export const ANALYTICS_API_ENDPOINT = process.env.MATOMO_API_ENDPOINT;
// these should map to the websites ids in the matomo dashboard (Measurables -> Manage)
export const NETWORK_TO_ANALYTICS_SITE_ID_MAP: Record<Wallet.Cardano.NetworkId, number> = {
  [Wallet.Cardano.NetworkId.Mainnet]: 14,
  [Wallet.Cardano.NetworkId.Testnet]: 13
};
