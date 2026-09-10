import {
  paysMembersAtSaturation,
  rankPoolsByNonMyopicReward,
} from './rank-pools';

import type { RankedPoolInput } from './rank-pools';
import type { LacePartialStakePool, StakePoolsNetworkData } from './types';

/**
 * The pool fields the recommendation consumes — all present on a bulk summary,
 * which is what lets the whole list be scored in one pass with no extra
 * requests.
 */
export type RecommendablePool = Pick<
  LacePartialStakePool,
  | 'blocks'
  | 'cost'
  | 'declaredPledge'
  | 'liveSaturation'
  | 'liveStake'
  | 'margin'
  | 'poolId'
  | 'ticker'
>;

/**
 * Saturation past which a pool is not recommended at all. There is no room left
 * for the delegation being made: the stake pushes the pool over and every
 * member's share, the new one included, starts to dilute.
 *
 * This is the gap between the two sources. The reward specification prices
 * every pool inside the desired `k` at saturation (`max(σ, z0)`, §3), which
 * makes the score identical for a pool at 2% and one at 98% and penalises only
 * pools already past 100%. That is the right answer to "what would this pool
 * pay at its target size" and the wrong answer to "what would MY stake earn if
 * I delegated it now".
 */
const SATURATION_LIMIT = 95;

/** Below this, a pool with stake but no blocks ever minted reads as abandoned. */
const ABANDONED_STAKE_FLOOR = 1_000_000_000_000;

/**
 * Weights over the components this data can actually support.
 *
 * The recommendation design specifies four: yield 40%, reliability 25%,
 * decentralization 20%, headroom 15%. Reliability needs per-epoch blocks and
 * active stake for every pool over ~20 epochs, and the bulk endpoint carries a
 * single LIFETIME block count — the per-epoch history is one request per pool,
 * thousands for a full list. So reliability cannot be computed here at all, and
 * its 25% is not silently redistributed by pretending a value: the remaining
 * weights are renormalised so the score still spans 0–1, and what the ordering
 * cannot see is stated rather than hidden.
 *
 * Decentralization is included but PARTIAL — see `concentrationScore`.
 */
const WEIGHTS = { yield: 0.4, decentralization: 0.2, headroom: 0.15 } as const;
const WEIGHT_TOTAL =
  WEIGHTS.yield + WEIGHTS.decentralization + WEIGHTS.headroom;

/**
 * Saturation headroom as a curve rather than a line, per the recommendation
 * design: 30–70% is the sweet spot and scores full marks; below 30% the score
 * eases off, because a small pool mints blocks rarely and pays erratically even
 * when it is perfectly fair over the long run; above 70% it falls away steeply,
 * reaching zero at saturation.
 *
 * This is the component that answers the question the reward maths cannot: it
 * is the only place current saturation influences the order below 100%.
 */
export const headroomScore = (saturationPercent: number): number => {
  if (saturationPercent < 0) return 0;
  if (saturationPercent < 30) return 0.4 + (0.6 * saturationPercent) / 30;
  if (saturationPercent <= 70) return 1;
  if (saturationPercent >= 100) return 0;
  // Steep, not linear: the last stretch before saturation is worth much less
  // than the first, so 95% is far below 75% rather than proportionally below.
  return Math.pow((100 - saturationPercent) / 30, 2);
};

/**
 * Tickers that assert no identity. Measured on mainnet, `N/A` alone was held by
 * 18 pools under 18 different reward addresses — unrelated operators who all
 * left the field blank in the same way. Treating that as a family of 18 costs
 * each of them 94% of their concentration score for siblings they do not have,
 * so a placeholder counts as no ticker at all.
 */
const PLACEHOLDER_TICKERS = new Set([
  '-',
  '--',
  'N/A',
  'NA',
  'NONE',
  'TBA',
  'TBD',
  'TICKER',
  'XXX',
]);

/**
 * Whether the user can tell what this pool IS.
 *
 * The cause is metadata: never published, or its fetch or parse failed, and it
 * arrives as blank fields. The test is the TICKER specifically, because the
 * ticker is the only identity the browse card renders — `pool.ticker ?? '??'`,
 * with no fallback to the pool name. Testing anything wider would let a pool
 * that still renders as `??` be recommended.
 *
 * On mainnet the two are the same set: at epoch 650, 895 of 2,678 pools had no
 * metadata object at all, and those were exactly the 895 with no usable ticker
 * — none carried a name without a ticker. So this is currently equivalent to
 * "has metadata", and it is written against the ticker so it stays correct if
 * that ever stops being true.
 *
 * If the card ever falls back to the pool name, this has to move with it.
 */
const isIdentifiable = (pool: RecommendablePool): boolean =>
  typeof pool.ticker === 'string' && pool.ticker.trim().length > 0;

/**
 * A ticker family: the letters a ticker starts with, before any trailing
 * digits. `WPBJ1`, `WPBJ2`, `WPBJ3` share one; so do `GMO1`/`GMO2` and
 * `BCSH`/`BCSH0`.
 */
const tickerFamily = (ticker: string | null): string | undefined => {
  const trimmed = (ticker ?? '').trim().toUpperCase();
  if (PLACEHOLDER_TICKERS.has(trimmed)) return undefined;
  const letters = trimmed.replace(/\d+$/, '');
  return letters.length >= 3 ? letters : undefined;
};

/**
 * Operator concentration, as far as this data can see it.
 *
 * The design detects siblings from a shared reward address, pledge address or
 * metadata fingerprint. None of the first two are on the bulk endpoint
 * (`pools/extended` returns no `owners` and no `reward_account`), and fetching
 * them is one request per pool. What IS here is the ticker, and multi-pool
 * operators overwhelmingly number their tickers — so a ticker family is the
 * metadata fingerprint we can afford.
 *
 * Deliberately imperfect, in a known direction: it catches the operator who
 * numbers their pools and misses the one who disguises them, so it can
 * under-penalise but rarely over-penalise. A family needs three or more letters
 * so short tickers do not collide by accident, and a pool with no usable ticker
 * is treated as a single-pool operator rather than punished for it — absent
 * metadata is already a hard filter.
 */
const concentrationScore = (
  pool: RecommendablePool,
  familySizes: Map<string, number>,
): number => {
  const family = tickerFamily(pool.ticker);
  const siblings = family === undefined ? 1 : familySizes.get(family) ?? 1;
  return 1 / siblings;
};

/**
 * Pools that should never be recommended, whatever else they score. Separate
 * from whether a pool is findable: these are dropped from the recommended
 * ORDER, never from the list or its search, because a user looking for one
 * particular pool is not being recommended anything.
 *
 * Two of the design's filters are missing and cannot be added from this data:
 * a live pledge below the declared one (the bulk endpoint carries only the
 * declared figure — the caller's `liveStake >= declaredPledge` filter is the
 * available proxy) and retirement (the caller applies it from network data).
 */
export const isRecommendable = (
  pool: RecommendablePool,
  networkData: StakePoolsNetworkData,
): boolean => {
  if (pool.liveSaturation >= SATURATION_LIMIT) return false;
  // Stake but nothing ever minted: the block count is lifetime, so this cannot
  // catch a pool that stopped recently — only one that never started.
  if (pool.blocks === 0 && pool.liveStake >= ABANDONED_STAKE_FLOOR)
    return false;
  /**
   * The operator's terms leave members nothing. This has to disqualify rather
   * than merely score low: yield is one weighted component of three, so a pool
   * paying zero still kept ~47% of a perfect score from headroom and
   * concentration alone — enough to sit mid-table, and in a list where slots
   * are scarce, enough to sit first.
   */
  if (!paysMembersAtSaturation(pool, networkData)) return false;
  /**
   * Nothing identifies the pool. Absent or invalid metadata reaches us as blank
   * fields and renders as "??", and a delegator cannot evaluate a pool they
   * cannot name.
   *
   * The list's comparator already sinks these below every identifiable pool, on
   * every sort. Checking it here too is not redundant: without it the SCORE
   * disagrees with the order the user is shown, and a score that has to be read
   * alongside a separate display rule is a score that means nothing on its own.
   */
  if (!isIdentifiable(pool)) return false;
  return true;
};

/**
 * Orders the pool list as a recommendation, combining both sources this
 * decision rests on:
 *
 * - the reward specification supplies the YIELD component — the non-myopic
 *   member reward per unit of stake, which judges a pool at the size it would
 *   hold and so cannot be flattered by a pool being small and lucky today;
 * - the recommendation design supplies the frame around it: hard filters, a
 *   saturation-headroom curve, an operator-concentration penalty, and the
 *   weighting between them.
 *
 * Each component is normalised to 0–1 (yield against the best in the set, as
 * the design specifies) so the weights mean what they say. Returns a score per
 * pool; pools that fail a hard filter are absent, which the list's comparator
 * sinks in both directions rather than ordering as merely poor.
 */
export const recommendPools = (
  pools: readonly RecommendablePool[],
  networkData: StakePoolsNetworkData,
): Map<string, number> => {
  const candidates = pools.filter(pool => isRecommendable(pool, networkData));
  if (candidates.length === 0) return new Map();

  /**
   * Both of these are properties of the WHOLE pool set, so they are measured
   * over `pools` and not over the recommendable subset.
   *
   * The ranking matters most: it prices a pool inside the desired `k` at
   * saturation and everything below it at pledge alone, so the cutoff has to
   * be taken against the real network. Filtering first would free `k` slots —
   * and the pools a hard filter removes are disproportionately the ones that
   * earned their way to being full — promoting marginal pools into saturation
   * pricing and inflating the largest component of their score.
   *
   * A ticker family is the same kind of fact: an operator running three pools
   * still runs three of them when two are filtered out, and the survivor
   * should carry the whole family's penalty.
   */
  const familySizes = new Map<string, number>();
  for (const pool of pools) {
    const family = tickerFamily(pool.ticker);
    if (family !== undefined)
      familySizes.set(family, (familySizes.get(family) ?? 0) + 1);
  }

  const rewards = rankPoolsByNonMyopicReward(
    pools as readonly RankedPoolInput[],
    networkData,
  );
  // Normalised against the best RECOMMENDABLE pool, so the top recommendation
  // scores 1 on yield — a filtered pool is not a yardstick for advice.
  const bestReward = Math.max(
    0,
    ...candidates.map(pool => rewards.get(pool.poolId) ?? 0),
  );

  return new Map(
    candidates.map(pool => {
      // Normalised against the best in the set. With no positive reward
      // anywhere the yield component carries no information, so it scores 0
      // for everyone and the other components decide.
      const yieldScore =
        bestReward > 0 ? (rewards.get(pool.poolId) ?? 0) / bestReward : 0;
      const score =
        (WEIGHTS.yield * yieldScore +
          WEIGHTS.decentralization * concentrationScore(pool, familySizes) +
          WEIGHTS.headroom * headroomScore(pool.liveSaturation)) /
        WEIGHT_TOTAL;
      return [pool.poolId, score] as const;
    }),
  );
};
