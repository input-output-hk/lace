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

// Code-unit order, matching what a bare sort() does for strings — the key must
// be byte-stable across devices and locales, which localeCompare is not.
const compareRewardAccounts = (
  a: CardanoRewardAccount,
  b: CardanoRewardAccount,
): number => (a < b ? -1 : a > b ? 1 : 0);

export const UtxoCacheKey = (params: {
  topOnChainActivityId: string;
  stakeKeys: readonly CardanoRewardAccount[];
  accountAddressCount: number;
}): UtxoCacheKey =>
  `${params.topOnChainActivityId}:${[...params.stakeKeys]
    .sort(compareRewardAccounts)
    .join(',')}:n${params.accountAddressCount}` as UtxoCacheKey;

/**
 * The owned-address count the fetch behind this key was filtered against.
 * Consumers compare it with the live address count to tell a UTxO set that
 * covers the full discovered account from one produced mid-discovery, which
 * legitimately dropped every UTxO on a not-yet-known address. `undefined`
 * when no fetch has completed yet.
 */
UtxoCacheKey.addressCount = (
  key: UtxoCacheKey | undefined,
): number | undefined => {
  const match = key === undefined ? null : /:n(\d+)$/.exec(key);
  return match ? Number(match[1]) : undefined;
};

/**
 * The on-chain activity id the fetch behind this key was made at. Two keys
 * with the same activity id differ only in ownership (stake keys / address
 * count) — a fetch is then a re-verification of a set the chain has not moved
 * under, not a wait for the provider to catch up to new activity.
 */
UtxoCacheKey.topOnChainActivityId = (
  key: UtxoCacheKey | undefined,
): string | undefined => key?.split(':')[0];
