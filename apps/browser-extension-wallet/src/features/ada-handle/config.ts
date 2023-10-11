import { Cardano } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';

export const ADA_HANDLE_POLICY_ID = Wallet.ADA_HANDLE_POLICY_ID;
export const isAdaHandleEnabled = process.env.USE_ADA_HANDLE === 'true';
export const HANDLE_SERVER_URLS: Record<Cardano.NetworkMagics, string> = {
  [Cardano.NetworkMagics.Mainnet]: 'https://api.handle.me',
  [Cardano.NetworkMagics.Preprod]: 'https://preprod.api.handle.me',
  [Cardano.NetworkMagics.Preview]: 'https://preview.api.handle.me',
  [Cardano.NetworkMagics.Testnet]: ''
};
