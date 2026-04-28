import { ChannelName } from '@lace-sdk/extension-messaging';

/**
 * Channel for authenticator API communication (enable, isEnabled).
 * Used by injected script to communicate with service worker for
 * dApp authorization flows.
 */
export const CARDANO_AUTHENTICATOR_API_CHANNEL = ChannelName(
  'cardano-authenticator',
);

/**
 * Channel for wallet API communication (CIP-30 methods).
 * Used by injected script to communicate with service worker for
 * wallet operations like getBalance, signTx, etc.
 */
export const CARDANO_WALLET_API_CHANNEL = ChannelName('cardano-wallet-api');
