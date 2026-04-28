import type { NetworkType } from '@lace-contract/network';

/** Display ticker for ADA on Cardano mainnet. */
export const ADA_TOKEN_TICKER = 'ADA' as const;

/** Display ticker for ADA on Cardano testnets (preprod, preview, etc.). */
export const TADA_TOKEN_TICKER = 'tADA' as const;

/**
 * Returns the user-facing ticker for the native Cardano token for Lace mainnet vs testnet mode.
 *
 * @param networkType - From `network.selectNetworkType` (`'mainnet'` | `'testnet'`), or `undefined` (treated as mainnet display **ADA**)
 * @returns `'ADA'` on mainnet or when `networkType` is missing, `'tADA'` on testnet
 */
export const getAdaTokenTickerByNetwork = (
  networkType: NetworkType | undefined,
): typeof ADA_TOKEN_TICKER | typeof TADA_TOKEN_TICKER =>
  networkType === 'testnet' ? TADA_TOKEN_TICKER : ADA_TOKEN_TICKER;
