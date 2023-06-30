import { Cardano } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';

export const ADA_HANDLE_POLICY_ID = Wallet.Cardano.PolicyId('f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a');
export const isAdaHandleEnabled = process.env.USE_ADA_HANDLE === 'true';
export const HANDLE_SERVER_URLS: Record<Cardano.NetworkMagics, string> = {
  [Cardano.NetworkMagics.Mainnet]: 'https://api.handle.me',
  [Cardano.NetworkMagics.Preprod]: 'https://preprod.api.handle.me',
  [Cardano.NetworkMagics.Preview]: 'https://preview.api.handle.me',
  [Cardano.NetworkMagics.Testnet]: ''
};
