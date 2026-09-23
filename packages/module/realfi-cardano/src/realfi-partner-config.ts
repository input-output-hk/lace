/**
 * Runtime partner configuration (`partner-config.json`) — the authoritative,
 * product-curated swap-counterpart list shared with the deployed RealFi dapp;
 * the same document the partner SDK's `getPartnerConfig()` reads. Fetched by
 * hand because this file is page-bundled (ManageStake) — importing the SDK
 * root would pull Blaze/Sundae into the tab bundle.
 *
 * Validation mirrors the SDK's `parsePartnerConfig` where it matters here:
 * asset ids must be Sundae's canonical dotted form, and the document's
 * `stablecoinAssetId` must match the compiled config's USDr — a mismatch
 * means the deployment moved from under the compiled values, so the whole
 * read is rejected (compiled fallback + loud warn) rather than trusting half
 * of a diverged document.
 */
import { realfiDebugLog } from '@lace-contract/realfi-staking';

import { USDR_ASSET_NAME_HEX } from './realfi-config';

import type { RealFiNetworkConfig } from './realfi-config';

/** Sundae canonical dotted asset id (mirrors the SDK's `PARTNER_ASSET_ID`). */
const PARTNER_ASSET_ID =
  /^(?:ada\.lovelace|[0-9a-f]{56}\.(?:[0-9a-f]{2}){0,32})$/;

/** Re-read the runtime list at most once per this interval per URL. */
const PARTNER_CONFIG_CACHE_TTL_MS = 5 * 60_000;

const cache = new Map<string, { assets: string[]; at: number }>();

const isAssetIdList = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every(
    asset => typeof asset === 'string' && PARTNER_ASSET_ID.test(asset),
  );

/**
 * The live product-curated swap-counterpart list, or `undefined` when the
 * read fails or fails validation — callers fall back to the compiled
 * `swapCounterpartAssets` copy.
 */
export const fetchSwapCounterpartAssets = async (
  config: Pick<RealFiNetworkConfig, 'partnerConfigUrl' | 'usdrPolicyId'>,
): Promise<string[] | undefined> => {
  const cached = cache.get(config.partnerConfigUrl);
  if (cached && Date.now() - cached.at < PARTNER_CONFIG_CACHE_TTL_MS) {
    return cached.assets;
  }
  try {
    const response = await fetch(config.partnerConfigUrl, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`partner-config fetch failed: ${response.status}`);
    }
    const raw = (await response.json()) as {
      stablecoinAssetId?: unknown;
      swapCounterpartAssets?: unknown;
    };
    const assets = raw.swapCounterpartAssets;
    if (!isAssetIdList(assets)) {
      throw new Error('swapCounterpartAssets is not an asset-id array');
    }
    const expectedUsdr = `${config.usdrPolicyId}.${USDR_ASSET_NAME_HEX}`;
    if (raw.stablecoinAssetId !== expectedUsdr) {
      throw new Error(
        `stablecoinAssetId ${String(
          raw.stablecoinAssetId,
        )} diverges from the compiled USDr ${expectedUsdr}`,
      );
    }
    cache.set(config.partnerConfigUrl, { assets, at: Date.now() });
    return assets;
  } catch (error) {
    realfiDebugLog('partner-config read failed', { error });
    return undefined;
  }
};

/** The pool fields the buildable-input filter reads from Sundae discovery. */
export type BuildablePoolPair = {
  assetA: { assetId: string };
  assetB: { assetId: string };
};

/**
 * Stake-input candidates narrowed to those a live pool can actually fill:
 * keeps a candidate only when one of the discovered (already
 * composable-filtered) USDr pools pairs it. An asset the discovery returned no
 * pool for is dropped — offering it would only quote-fail on selection.
 */
export const filterBuildableStakeInputs = (
  candidateIds: string[],
  buildableUsdrPools: BuildablePoolPair[],
): string[] =>
  candidateIds.filter(candidateId =>
    buildableUsdrPools.some(
      pool =>
        pool.assetA.assetId === candidateId ||
        pool.assetB.assetId === candidateId,
    ),
  );
