import { BigNumber } from '@lace-sdk/util';

import type { TokenPrice } from './types';
import type { TokenPriceId } from './value-objects';

/**
 * Categorical bucket for the fiat value of a token transfer / delegation /
 * any other value-bearing user action. Buckets are USD-denominated so the
 * same label ('WHALE', 'M', etc.) means the same thing across all events.
 *
 * `'UNKNOWN'` is a fallback when pricing cannot be computed (price missing,
 * stale, or no FX rate for the fetched currency).
 */
export type TransferValueBucket =
  | 'L'
  | 'M'
  | 'S'
  | 'UNKNOWN'
  | 'WHALE'
  | 'XL'
  | 'XS'
  | 'XXL'
  | 'XXXL';

// Exclusive upper bound per bucket. Values are USD.
// amount < first threshold → first bucket; amount ≥ last threshold → 'WHALE'.
const USD_THRESHOLDS: ReadonlyArray<readonly [number, TransferValueBucket]> = [
  [10, 'XS'],
  [100, 'S'],
  [500, 'M'],
  [2500, 'L'],
  [10_000, 'XL'],
  [50_000, 'XXL'],
  [100_000, 'XXXL'],
];

export const bucketUsdValue = (usd: number): TransferValueBucket => {
  for (const [threshold, bucket] of USD_THRESHOLDS) {
    if (usd < threshold) return bucket;
  }
  return 'WHALE';
};

/**
 * Convert an amount of a single token (in smallest units) into USD.
 *
 * Returns undefined when the price cannot be computed:
 *  - token has no price entry in the cache,
 *  - the cached price is stale,
 *  - the cached priceInUsd is missing or zero.
 *
 * Consumers should treat undefined as "bucket as UNKNOWN".
 */
export const priceAmountInUsd = ({
  amount,
  decimals,
  priceId,
  prices,
}: {
  amount: BigNumber;
  decimals: number;
  priceId: TokenPriceId;
  prices: Record<TokenPriceId, TokenPrice>;
}): number | undefined => {
  const tokenPrice = prices[priceId];
  if (!tokenPrice) return undefined;
  if (tokenPrice.isStale) return undefined;
  if (!tokenPrice.priceInUsd || tokenPrice.priceInUsd <= 0) return undefined;
  const smallestUnits = Number(BigNumber.valueOf(amount));
  const fullUnits = smallestUnits / 10 ** decimals;
  return fullUnits * tokenPrice.priceInUsd;
};
