/**
 * The Bitcoin feature flags, networks and provider configuration, shared by
 * the Bitcoin entry and the canary root entry.
 */
export {
  BITCOIN_FEATURE_FLAG,
  BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG,
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
export type {
  BitcoinFeeMarketProviderConfig,
  BitcoinProviderConfig,
} from '@lace-contract/bitcoin-context';
export type {
  MaestroClientConfig,
  MaestroConfig,
} from '@lace-lib/bitcoin-provider-core';
