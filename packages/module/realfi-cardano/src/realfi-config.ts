/**
 * Module-local RealFi helpers. The per-network config itself lives in the
 * `REALFI` feature-flag payload (see `@lace-contract/realfi-staking`
 * `getRealFiConfigFromFlags`), so it can rotate from the CMS without a release;
 * that resolver also carries the compile-time preview fallback.
 *
 * This file keeps only the canonical (network-stable) asset name hexes, the
 * Manage-Stake stablecoin ticker allow-list, and `isUsdrTokenId`.
 */

// Re-export the shared config type so module files keep importing it from here.
export type { RealFiNetworkConfig } from '@lace-contract/realfi-staking';

/** Canonical Cardano asset names (hex) — stable across networks. */
export const USDR_ASSET_NAME_HEX = '55534472'; // "USDr"
export const SUSDR_ASSET_NAME_HEX = '7355534472'; // "sUSDr"

/**
 * Slippage tolerance for the SundaeSwap leg's `minReceived` floor. The SDK's
 * `quoteSwap` requires an explicit tolerance (no application default; the
 * RealFi leg's own `min_received` keeps the SDK's 50 bps default inside
 * `buildStakeContinuation`); this matches the 3% default RealFi's own app
 * uses for the swap (realfi-co/realfi frontend/app GetUSDr SwapProvider). It is
 * the swap floor only — never shown to the user.
 */
export const SUNDAE_SWAP_SLIPPAGE = 0.03;

/**
 * True when the swap token is the given network's USDr itself — in which case
 * there is no swap leg, only the RealFi stake leg (USDr → sUSDr). Accepts either
 * the concatenated wallet form (`<policyId><assetNameHex>`) or the dotted
 * `policyId.assetNameHex` form.
 */
export const isUsdrTokenId = (
  walletTokenId: string,
  usdrTokenId: string,
): boolean =>
  walletTokenId.replace('.', '').toLowerCase() === usdrTokenId.toLowerCase();
