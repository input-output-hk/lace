import { FeatureFlagKey } from '@lace-contract/feature';

/**
 * Sets the network type a new wallet starts on: its payload is `'mainnet'` or
 * `'testnet'`, or `{ networkType }` with either. The default is `'mainnet'`;
 * once the wallet persists a network type, that one applies.
 */
export const FEATURE_FLAG_NETWORK_TYPE = FeatureFlagKey('INITIAL_NETWORK_TYPE');
