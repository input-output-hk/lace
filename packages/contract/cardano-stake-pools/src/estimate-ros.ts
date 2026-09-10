import { hasRateParameters } from './reward-parameters';

import type { LaceStakePool, StakePoolsNetworkData } from './types';

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

/**
 * The pool fields the estimate consumes. A `Pick` rather than `LaceStakePool`
 * so the browse list can estimate from its bulk summaries: the bulk API carries
 * no live pledge, and the list substitutes the declared pledge (see
 * `estimateSummaryROS`), which a full-pool signature would silently allow
 * nowhere and a summary type would allow everywhere.
 */
export type RosEstimateInput = Pick<
  LaceStakePool,
  'blocks' | 'cost' | 'declaredPledge' | 'livePledge' | 'liveStake' | 'margin'
>;

/**
 * Estimated annual return of staking with a pool, as a FRACTION (0.031 =
 * 3.1%/yr) — callers convert for display. An estimate in the strict sense:
 * live values stand in for the epoch-rollover snapshot the ledger actually
 * rewards on, and pool performance is assumed proportional to stake.
 *
 * Ref: https://github.com/intersectmbo/cardano-ledger/releases/latest/download/shelley-ledger.pdf
 * (Fig. 46–47); Conway variant per
 * https://intersectmbo.github.io/formal-ledger-specifications/cardano-ledger.pdf (Fig. 64).
 */
export const estimateStakePoolROS = (
  stakePool: RosEstimateInput,
  stakePoolsNetworkData: StakePoolsNetworkData,
): number => {
  const livePledge = stakePool.livePledge;
  const declaredPledge = stakePool.declaredPledge;
  const liveStake = stakePool.liveStake;
  const delegatedStake = Number(stakePoolsNetworkData.liveStake);
  /**
   * The ada in circulation, which is the ledger's `totalStake` for the reward
   * calculation — NOT the amount delegated. The two differ by the staking
   * ratio (roughly half of circulating ada is delegated), and this is the
   * denominator that makes `z0 = 1/k` the familiar ~1/500th-of-circulating
   * saturation cap.
   */
  const circulatingSupply =
    Number(stakePoolsNetworkData.maxLovelaceSupply) -
    Number(stakePoolsNetworkData.reserves);

  // If the live pledge is lesser than the declared pledge, the ROS is 0
  // If the live stake is 0, the ROS is 0
  // Neither total should ever be 0, but a half-loaded network snapshot does
  // reach this code, and both are divisors below.
  if (
    livePledge < declaredPledge ||
    liveStake === 0 ||
    delegatedStake === 0 ||
    circulatingSupply <= 0 ||
    !hasRateParameters(stakePoolsNetworkData)
  )
    return 0;

  // Fig. 46.1

  const monetaryExpansion = Number(stakePoolsNetworkData.monetaryExpansion);
  const reserves = Number(stakePoolsNetworkData.reserves);
  const a0 = Number(stakePoolsNetworkData.poolInfluence);
  const pr = livePledge / circulatingSupply;
  const s = liveStake / circulatingSupply;
  const z0 = 1 / stakePoolsNetworkData.desiredNumberOfPools;
  const p1 = Math.min(pr, z0);
  const s1 = Math.min(s, z0);
  // The treasury takes `tau` of the pot before pools are paid, so only the
  // remainder is available to reward members.
  const R =
    reserves *
    monetaryExpansion *
    (1 - Number(stakePoolsNetworkData.treasuryCut));

  const maxPool =
    (R / (1 + a0)) * (s1 + (p1 * a0 * (s1 - (p1 * (z0 - s1)) / z0)) / z0);

  // Estimated Fig. 46.2 inputs
  //
  // Block production uses a DIFFERENT relative stake from the reward
  // calculation above: a pool is elected leader in proportion to its share of
  // the stake that is actually delegated, so this one is relative to the
  // delegated total. Conflating the two is what made the estimate read about
  // double: the saturation cap came out at half its real size, and pools well
  // short of saturation were priced as if they had reached it.

  const activeShare = liveStake / delegatedStake;
  const blocksPerEpoch =
    stakePoolsNetworkData.epochLength *
    stakePoolsNetworkData.activeSlotsCoefficient;
  const poolBlocks = blocksPerEpoch * activeShare;

  // Estimated Fig. 46.2
  // The document refers to the number of blocks the pool added to the chain and the total number of blocks added
  // to the chain in the last epoch. Using estimated values for current epoch.
  // In Conway era the formula was changed; the d >= 0.8 case no longer exists.

  const computeEpochROS = (blocks: number) => {
    const mkApparentPerformance = blocks / (blocksPerEpoch * activeShare);

    // Simplified Fig. 47.2
    // BF does not offer a way to distinguish between member stake and operator stake.
    // By luck, there is no need to distinguish between member rewards and operator rewards; it is enough to compute
    // the reward from member perspective as if all the stake was controlled by the members.
    // This is why the multiplication by member proportional stake is not needed.
    // It is mandatory to keep in mind this in next steps.

    const rewards = maxPool * mkApparentPerformance;
    const c = stakePool.cost;
    const m = stakePool.margin;

    // If the rewards are less than the stakePool cost, the ROS is 0
    if (rewards <= c) return 0;

    // The omitted computation of member proportional stake.
    // t = memberStake / stake;
    // memberRewards = (rewards - c) * (1 - m) * t;
    // simplifiedMemberRewards = memberRewards / t = memberRewards * stake / memberStake;
    const simplifiedMemberRewards = (rewards - c) * (1 - m);

    // The epoch ROS is the memberRewards divided by the member stake.
    // Given the simplification in Fig. 47.2, dividing the simplified memberRewards by the entire stake gives the same result.
    // epochROS = memberRewards / memberStake = (simplifiedMemberRewards * memberStake / stake) / memberStake;
    return liveStake === 0 ? 0 : simplifiedMemberRewards / liveStake;
  };

  // Annualized ROS

  const secondsPerEpoch =
    stakePoolsNetworkData.epochLength * stakePoolsNetworkData.slotLength;
  const epochsPerYear = SECONDS_PER_YEAR / secondsPerEpoch;

  const poolBlocksFloor = Math.floor(poolBlocks);
  const epochsAtCeilWeight = poolBlocks - poolBlocksFloor;
  const epochsAtFloorWeight = 1 - epochsAtCeilWeight;

  const epochROSFloor = computeEpochROS(poolBlocksFloor);
  const epochROSCeil = computeEpochROS(poolBlocksFloor + 1);
  const epochsAtFloor = epochsPerYear * epochsAtFloorWeight;
  const epochsAtCeil = epochsPerYear * epochsAtCeilWeight;

  return (
    Math.pow(1 + epochROSFloor, epochsAtFloor) *
      Math.pow(1 + epochROSCeil, epochsAtCeil) -
    1
  );
};

/**
 * The browse-list variant: estimates from a bulk summary, which carries no
 * live pledge. The declared pledge stands in — it is the operator's own stated
 * commitment, and the summary has nothing closer — so the live-pledge-broken
 * guard above cannot trip here. The details screen keeps the strict figure;
 * this one exists so the list can show and sort by a rate at all, worded as an
 * estimate wherever it renders.
 */
export const estimateSummaryROS = (
  summary: Omit<RosEstimateInput, 'livePledge'>,
  stakePoolsNetworkData: StakePoolsNetworkData,
): number | undefined =>
  /**
   * `undefined`, never `0`, when the network data cannot support the maths.
   *
   * Zero and absent mean different things on a card: `~0%` says this pool earns
   * its members nothing, which is a real answer, while `—` says we cannot tell.
   * Returning 0 for an unusable payload prints a concrete and wrong figure
   * against EVERY pool at once. The ranking already declines to score in that
   * case; the rate has to decline in the same way or the two disagree.
   */
  hasRateParameters(stakePoolsNetworkData)
    ? estimateStakePoolROS(
        { ...summary, livePledge: summary.declaredPledge },
        stakePoolsNetworkData,
      )
    : undefined;
