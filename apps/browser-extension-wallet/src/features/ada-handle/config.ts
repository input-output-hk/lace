import { Cardano } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { isFeatureEnabled } from '@src/utils/feature-flags';

export const ADA_HANDLE_POLICY_ID = Wallet.ADA_HANDLE_POLICY_ID;
export const isAdaHandleEnabled = isFeatureEnabled('ADA_HANDLE');
export const HANDLE_SERVER_URLS: Record<Exclude<Cardano.NetworkMagics, Cardano.NetworkMagics.Sanchonet>, string> = {
  [Cardano.NetworkMagics.Mainnet]: 'https://api.handle.me',
  [Cardano.NetworkMagics.Preprod]: 'https://preprod.api.handle.me',
  [Cardano.NetworkMagics.Preview]: 'https://preview.api.handle.me'
};
