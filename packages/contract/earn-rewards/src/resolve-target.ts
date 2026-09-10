import { Cardano } from '@cardano-sdk/core';
import {
  estimateDaysUntilFirstReward,
  promotedNetworkKeyForChainId,
} from '@lace-contract/cardano-context';
import {
  FEATURE_FLAG_GOVERNANCE_CENTER,
  isSentinelDrepId,
  parseGovernanceFeatureFlagPayload,
} from '@lace-contract/governance-center';
import {
  FEATURE_FLAG_STAKING_CENTER,
  parseStakingFeatureFlagPayload,
} from '@lace-contract/staking-center';

import {
  FEATURE_FLAG_EARN_REWARDS,
  parseEarnRewardsFeatureFlagPayload,
} from './const';
import { parseEarnRewardsRate } from './rate';

import type { EarnRewardsTarget } from './store/types';
import type { SpecificDRepOption } from '@lace-contract/cardano-context';
import type { FeatureFlag } from '@lace-contract/feature';

/**
 * Earn-rewards promotes a *specific* DRep for governance participation — the
 * spec's hard decision forbids delegating the user's vote to a sentinel. A
 * promoted id that is one of Blockfrost's abstain / no-confidence sentinels is
 * therefore a misconfigured target: `undefined` hides the offer, exactly like a
 * malformed id, and never becomes a real Always-Abstain / No-Confidence vote.
 */
const toSpecificDRepOption = (id: string): SpecificDRepOption | undefined =>
  isSentinelDrepId(id)
    ? undefined
    : { type: 'specific', drepId: Cardano.DRepID(id) };

/**
 * True when the earn-rewards feature is enabled (its module is loaded and the
 * flow sheet is therefore registered). Resolver-internal: a resolved target
 * already implies enablement, so consumers gate on the target alone rather than
 * re-checking this (see `resolveEarnRewardsTarget`).
 */
const isEarnRewardsEnabled = (featureFlags: readonly FeatureFlag[]): boolean =>
  featureFlags.some(flag => flag.key === FEATURE_FLAG_EARN_REWARDS);

/**
 * Resolves the locked earn-rewards target — the promoted pool + promoted DRep
 * for the active Cardano network — from the STAKING_CENTER and GOVERNANCE_CENTER
 * feature-flag payloads. `undefined` when the feature is disabled, the network
 * is unknown, or either target is not configured (feature not offered there).
 *
 * The `EARN_REWARDS` enablement flag is checked here so a resolved target ALWAYS
 * implies the feature is on — consumers can gate on the target alone and cannot
 * accidentally surface earn-rewards from the promoted payloads while the flag is
 * off (the STAKING/GOVERNANCE payloads serve their own centers regardless).
 */
export const resolveEarnRewardsTarget = ({
  featureFlags,
  chainId,
}: {
  featureFlags: readonly FeatureFlag[];
  chainId?: Cardano.ChainId;
}): EarnRewardsTarget | undefined => {
  if (!isEarnRewardsEnabled(featureFlags)) return undefined;

  const networkKey = chainId
    ? promotedNetworkKeyForChainId(chainId)
    : undefined;
  if (!networkKey) return undefined;

  const stakingFlag = featureFlags.find(
    flag => flag.key === FEATURE_FLAG_STAKING_CENTER,
  ) as { payload?: unknown } | undefined;
  const governanceFlag = featureFlags.find(
    flag => flag.key === FEATURE_FLAG_GOVERNANCE_CENTER,
  ) as { payload?: unknown } | undefined;
  const earnRewardsFlag = featureFlags.find(
    flag => flag.key === FEATURE_FLAG_EARN_REWARDS,
  ) as { payload?: unknown } | undefined;

  const pool =
    parseStakingFeatureFlagPayload(stakingFlag).promotedPools?.[
      networkKey
    ]?.[0];
  const dRep =
    parseGovernanceFeatureFlagPayload(governanceFlag).promotedDreps?.[
      networkKey
    ]?.[0];

  // Each leg resolves INDEPENDENTLY, and a malformed or sentinel id degrades
  // that leg to absent rather than hiding the whole offer — `Cardano.PoolId` /
  // `Cardano.DRepID` throw on invalid bech32, and this resolver runs during
  // render (nudge, staking & governance centers), so it must never crash the
  // surface. A promoted-DRep id that is one of the abstain / no-confidence
  // sentinels degrades the same way (see `toSpecificDRepOption`).
  //
  // The independence is the point (LW-15293): an absent pool must not disable
  // vote delegation — the user selects a pool instead — and an absent DRep
  // must not disable staking. Only when BOTH legs are absent is there nothing
  // to offer.
  const poolId = (() => {
    try {
      return pool ? Cardano.PoolId(pool.id) : undefined;
    } catch {
      return undefined;
    }
  })();
  const dRepOption = (() => {
    try {
      return dRep ? toSpecificDRepOption(dRep.id) : undefined;
    } catch {
      return undefined;
    }
  })();

  if (!poolId && !dRepOption) return undefined;

  return {
    poolId,
    dRep: dRepOption,
    // The advertised rate is a property of the PROMOTED offer: it rides on the
    // earn-rewards flag and is normalized here so consumers never touch the raw
    // shape — but only while the promoted pool exists to earn it. Once the user
    // selects their own pool the honest figure is that pool's estimate, so an
    // absent pool carries no advertised rate for any surface to mis-attach.
    rate: poolId
      ? parseEarnRewardsRate(
          parseEarnRewardsFeatureFlagPayload(earnRewardsFlag).rate?.[
            networkKey
          ],
        )
      : undefined,
    rewardEstimateDays: chainId
      ? estimateDaysUntilFirstReward(chainId)
      : undefined,
  };
};
