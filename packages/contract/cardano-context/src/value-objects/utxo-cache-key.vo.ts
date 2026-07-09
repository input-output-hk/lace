import type { CardanoRewardAccount } from '../types';
import type { Tagged } from 'type-fest';

/**
 * Cache key identifying the on-chain state AND ownership set that produced a
 * given UTxO set for an account. Combines:
 *   - the account's most recent on-chain activity id (captures chain changes),
 *   - the sorted set of stake keys whose UTxOs were fetched,
 *   - the count of owned account addresses (captures HD wallet discovery —
 *     when discovery finds new addresses the same Blockfrost-returned UTxO
 *     set must be re-filtered against the wider owned credential set, so
 *     a refetch is required even if no new on-chain activity occurred).
 *
 * Two fetches share a cache key iff all three match, which is the exact
 * condition under which the existing UTxO set remains authoritative and a
 * refetch can be skipped.
 */
export type UtxoCacheKey = Tagged<string, 'UtxoCacheKey'>;

export const UtxoCacheKey = (params: {
  topOnChainActivityId: string;
  stakeKeys: readonly CardanoRewardAccount[];
  accountAddressCount: number;
}): UtxoCacheKey =>
  `${params.topOnChainActivityId}:${[...params.stakeKeys].sort().join(',')}:n${
    params.accountAddressCount
  }` as UtxoCacheKey;
