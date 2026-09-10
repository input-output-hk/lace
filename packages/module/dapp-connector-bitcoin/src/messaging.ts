import { ChannelName } from '@lace-lib/extension-messaging';

/**
 * Channel for authenticator API communication (enable, isEnabled).
 * Used by the injected script to communicate with the service worker for
 * dApp authorization flows.
 */
export const BITCOIN_AUTHENTICATOR_API_CHANNEL = ChannelName(
  'bitcoin-authenticator',
);

/**
 * Channel for wallet API communication (getAccounts, getBalance, signPsbt, etc).
 * Used by the injected script to communicate with the service worker for
 * wallet operations.
 */
export const BITCOIN_WALLET_API_CHANNEL = ChannelName('bitcoin-wallet-api');
