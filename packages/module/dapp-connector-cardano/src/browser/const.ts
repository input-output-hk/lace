/**
 * CIP-30 API methods exposed by the Cardano wallet.
 * These method names are used to configure remote API properties
 * for extension messaging between dApps and the wallet service worker.
 *
 * @see https://cips.cardano.org/cip/CIP-30
 * @see https://cips.cardano.org/cip/CIP-95
 * @see https://cips.cardano.org/cip/CIP-142
 */
export const CIP30_API_METHODS = [
  'getNetworkId',
  'getUtxos',
  'getCollateral',
  'getBalance',
  'getUsedAddresses',
  'getUnusedAddresses',
  'getChangeAddress',
  'getRewardAddresses',
  'getExtensions',
  'signTx',
  'signData',
  'submitTx',
  'getPubDRepKey',
  'getRegisteredPubStakeKeys',
  'getUnregisteredPubStakeKeys',
  'getNetworkMagic',
] as const;

/**
 * Type representing a CIP-30 API method name.
 */
export type Cip30ApiMethod = (typeof CIP30_API_METHODS)[number];

/**
 * Maps CIP-30 API methods to the index where sender context should be
 * injected in the arguments array. Methods not listed here do not require
 * sender context (e.g., getNetworkId, getExtensions, getNetworkMagic).
 *
 * Used by exposeApi to transform method calls and inject the sender
 * information for request validation and per-origin account resolution.
 */
export const CIP30_SENDER_CONTEXT_INDEX: Partial<
  Record<Cip30ApiMethod, number>
> = {
  getUtxos: 2,
  getCollateral: 1,
  getBalance: 0,
  getUsedAddresses: 1,
  getUnusedAddresses: 0,
  getChangeAddress: 0,
  getRewardAddresses: 0,
  signTx: 2,
  signData: 2,
  getPubDRepKey: 0,
  getRegisteredPubStakeKeys: 0,
  getUnregisteredPubStakeKeys: 0,
};

/**
 * Route location for the dApp connect/authorization popup.
 * Opened when a dApp calls `cardano.lace.enable()`.
 */
export const CARDANO_DAPP_CONNECT_LOCATION = '/cardano-dapp-connect';

/**
 * Route location for the transaction signing popup.
 * Opened when a dApp calls `api.signTx()`.
 */
export const CARDANO_DAPP_SIGN_TX_LOCATION = '/cardano-dapp-sign-tx';

/**
 * Route location for the data signing popup (CIP-8).
 * Opened when a dApp calls `api.signData()`.
 */
export const CARDANO_DAPP_SIGN_DATA_LOCATION = '/cardano-dapp-sign-data';
