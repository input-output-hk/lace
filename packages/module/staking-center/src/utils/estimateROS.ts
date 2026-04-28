import type {
  LaceStakePool,
  StakePoolsNetworkData,
} from '@lace-contract/cardano-stake-pools';

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

export const estimateROS = (
  stakePool: LaceStakePool | undefined,
  stakePoolsNetworkData: StakePoolsNetworkData,
) => {
  if (!stakePool) return undefined;

  const livePledge = stakePool.livePledge;
  const declaredPledge = stakePool.declaredPledge;
  const liveStake = stakePool.liveStake;
  const totalStake = Number(stakePoolsNetworkData.liveStake);

  // If the live pledge is lesser than the declared pledge, the ROS is 0
  // If the live stake is 0, the ROS is 0
  // The total stake should never be 0... but in case of unknown issues this prevents from division by 0 errors
  if (livePledge < declaredPledge || liveStake === 0 || totalStake === 0)
    return { ...stakePool, ros: 0 };

  // Ref: https://github.com/intersectmbo/cardano-ledger/releases/latest/download/shelley-ledger.pdf
  // The document refers to stake, pledge, reserves, circulating, etc. It refers to values from the
  // snapshot at epoch rollover. Using live values to estimate the ROS in current epoch.

  // Fig. 46.1

  const monetaryExpansion = Number(stakePoolsNetworkData.monetaryExpansion);
  const reserves = Number(stakePoolsNetworkData.reserves);
  const a0 = Number(stakePoolsNetworkData.poolInfluence);
  const pr = livePledge / totalStake;
  const s = liveStake / totalStake;
  const z0 = 1 / stakePoolsNetworkData.desiredNumberOfPools;
  const p1 = Math.min(pr, z0);
  const s1 = Math.min(s, z0);
  const R = reserves * monetaryExpansion;

  const maxPool =
    (R / (1 + a0)) * (s1 + (p1 * a0 * (s1 - (p1 * (z0 - s1)) / z0)) / z0);

  // Estimated Fig. 46.2 inputs

  const blocksPerEpoch =
    stakePoolsNetworkData.epochLength *
    stakePoolsNetworkData.activeSlotsCoefficient;
  const poolBlocks = (blocksPerEpoch * liveStake) / totalStake;

  // Estimated Fig. 46.2
  // The document refers to the number of blocks the pool added to the chain and the total number of blocks added
  // to the chain in the last epoch. Using estimated values for current epoch.
  // In Conway era the formula was changed; the d >= 0.8 case no longer exists.
  // Ref: https://intersectmbo.github.io/formal-ledger-specifications/cardano-ledger.pdf - Fig. 64

  const computeEpochROS = (blocks: number) => {
    const mkApparentPerformance = blocks / (blocksPerEpoch * s);

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

  const ros =
    Math.pow(1 + epochROSFloor, epochsAtFloor) *
      Math.pow(1 + epochROSCeil, epochsAtCeil) -
    1;

  return { ...stakePool, ros };
};
