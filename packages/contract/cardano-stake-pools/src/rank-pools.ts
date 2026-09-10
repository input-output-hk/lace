import { hasRewardPotParameters } from './reward-parameters';

import type { LaceStakePool, StakePoolsNetworkData } from './types';

/** The pool fields the ranking consumes — all present on a bulk summary. */
export type RankedPoolInput = Pick<
  LaceStakePool,
  'cost' | 'declaredPledge' | 'liveStake' | 'margin' | 'poolId'
>;

/**
 * Apparent performance, `p̄` in the specification. Held at 1 for every pool.
 *
 * The real figure is a pool's hit rate — the share of its private leader
 * schedule it actually turned into blocks — estimated as a percentile of a
 * likelihood distribution refined each epoch (ranking spec §2). That needs
 * per-epoch blocks and active stake for every pool; the bulk endpoint carries
 * a lifetime block count and nothing else, and the per-epoch history is one
 * request per pool — thousands for a full list.
 *
 * Because it is the same constant for every pool it cancels out of the
 * ORDER, which stays valid. What is lost is the penalty: a pool that misses
 * its blocks ranks exactly like a reliable one with the same pledge and fees.
 * That gap is the reason this figure is never shown to the user as a rate.
 */
const ASSUMED_PERFORMANCE = 1;

/**
 * Rewards a pool produces in an epoch at member stake `sigma` and relative
 * pledge `pledge`, both as fractions of total stake — `f̂` in the delegation
 * specification (SL-D1 §5.5.3), the same function the live-rate estimate uses.
 */
const poolRewards = ({
  pledge,
  sigma,
  saturation,
  totalRewards,
  influence,
}: {
  pledge: number;
  sigma: number;
  saturation: number;
  totalRewards: number;
  influence: number;
}): number => {
  const cappedSigma = Math.min(sigma, saturation);
  const cappedPledge = Math.min(pledge, saturation);
  return (
    ((ASSUMED_PERFORMANCE * totalRewards) / (1 + influence)) *
    (cappedSigma +
      (cappedPledge *
        influence *
        (cappedSigma -
          (cappedPledge * (saturation - cappedSigma)) / saturation)) /
        saturation)
  );
};

/** What the operator keeps first: below its cost a pool pays members nothing. */
const afterOperatorCut = (rewards: number, cost: number, margin: number) =>
  rewards <= cost ? 0 : (rewards - cost) * (1 - margin);

/**
 * Orders pools by the non-myopic member reward per unit of delegated stake —
 * the metric the ranking specification hands delegators (§3).
 *
 * Ordering by the rewards a pool pays TODAY is the naïve approach that
 * specification opens by rejecting: it flatters a pool that is small and
 * lucky, because a tiny live stake divides the same rewards among fewer
 * delegators, and it says nothing about what the pool pays once stake arrives.
 *
 * So each pool is judged at the stake it WOULD hold. Desirability
 * `(f̃ − cost)(1 − margin)` — its rewards at saturation, net of the operator's
 * take — gives a first ordering; a pool inside the desired `k` is then priced
 * at saturation (or its current stake, whichever is larger, so an
 * oversaturated pool dilutes as it should), and a pool outside `k` at its
 * pledge alone, since non-myopically it is not expected to attract stake.
 *
 * Returned per unit of stake, so the figure is comparable across pools and
 * independent of how much the user intends to delegate. It is a SCORE for
 * ordering, not a rate to display: see ASSUMED_PERFORMANCE for what it cannot
 * see.
 */
/**
 * The network constants every pool is measured against, or `undefined` when the
 * snapshot cannot support the maths at all.
 */
const rewardContext = (networkData: StakePoolsNetworkData) => {
  /**
   * The ada in circulation, which is the ledger's `totalStake` for the reward
   * calculation — not the amount delegated. Using the delegated total would
   * halve the apparent saturation point, so pools well short of saturation
   * would be scored as if they had reached it.
   */
  const totalStake =
    Number(networkData.maxLovelaceSupply) - Number(networkData.reserves);
  const poolCount = networkData.desiredNumberOfPools;
  // Nothing to measure against: `1/k` and every relative stake are undefined.
  if (totalStake <= 0 || !poolCount || !hasRewardPotParameters(networkData))
    return undefined;

  return {
    totalStake,
    poolCount,
    saturation: 1 / poolCount,
    influence: Number(networkData.poolInfluence),
    // Net of the treasury's `tau` share, taken before pools are paid.
    totalRewards:
      Number(networkData.reserves) *
      Number(networkData.monetaryExpansion) *
      (1 - Number(networkData.treasuryCut)),
  };
};

/**
 * Whether a pool would pay its members anything at all, judged at saturation —
 * the same desirability the ranking sorts on, reduced to a yes or no.
 *
 * `false` means the operator's margin and fixed cost consume every reward the
 * pool earns, so a delegator joining it receives nothing. That is a pool being
 * unsuitable rather than merely poor, and it is why this is a filter and not a
 * low score: a weighted score lets the other components carry a pool that pays
 * nothing to a respectable position.
 *
 * Judged at saturation so the answer is about the operator's terms, not about
 * how much stake the pool happens to hold today.
 */
export const paysMembersAtSaturation = (
  pool: RankedPoolInput,
  networkData: StakePoolsNetworkData,
): boolean => {
  const context = rewardContext(networkData);
  if (!context) return false;
  const rewards = poolRewards({
    pledge: pool.declaredPledge / context.totalStake,
    sigma: context.saturation,
    saturation: context.saturation,
    totalRewards: context.totalRewards,
    influence: context.influence,
  });
  return afterOperatorCut(rewards, pool.cost, pool.margin) > 0;
};

export const rankPoolsByNonMyopicReward = (
  pools: readonly RankedPoolInput[],
  networkData: StakePoolsNetworkData,
): Map<string, number> => {
  const context = rewardContext(networkData);
  // An empty map leaves every pool unscored, which the list's comparator
  // already sinks to the end — unlike a NaN score, which would make the
  // comparator inconsistent and the whole order arbitrary.
  if (!context) return new Map();
  const { totalStake, poolCount, saturation, influence, totalRewards } =
    context;

  const relative = pools.map(pool => ({
    pool,
    pledge: pool.declaredPledge / totalStake,
    sigma: pool.liveStake / totalStake,
  }));

  // First pass: desirability at saturation, which is what decides whether a
  // pool is treated as one of the `k` that attract stake.
  const desirability = relative.map(entry => ({
    ...entry,
    value: afterOperatorCut(
      poolRewards({
        pledge: entry.pledge,
        sigma: saturation,
        saturation,
        totalRewards,
        influence,
      }),
      entry.pool.cost,
      entry.pool.margin,
    ),
  }));

  const ranked = [...desirability].sort((a, b) => b.value - a.value);

  return new Map(
    ranked.map(({ pool, pledge, sigma }, rank) => {
      // Inside `k`: stake arrives, so price it at saturation — unless it is
      // already past that, where the excess dilutes every member's share.
      // Outside `k`: only the operator's own pledge is assumed to stay.
      const nonMyopicStake =
        rank < poolCount ? Math.max(sigma, saturation) : pledge;
      if (nonMyopicStake === 0) return [pool.poolId, 0] as const;
      const rewards = poolRewards({
        pledge,
        sigma: nonMyopicStake,
        saturation,
        totalRewards,
        influence,
      });
      return [
        pool.poolId,
        afterOperatorCut(rewards, pool.cost, pool.margin) / nonMyopicStake,
      ] as const;
    }),
  );
};
