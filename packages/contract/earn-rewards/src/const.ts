import { FeatureFlagKey } from '@lace-contract/feature';

import type { EarnRewardsRateInput } from './rate';
import type { CardanoPromotedNetworkKey } from '@lace-contract/cardano-context';

/** Gates the earn-rewards module. Off by default; opt-in per environment. */
export const FEATURE_FLAG_EARN_REWARDS = FeatureFlagKey('EARN_REWARDS');

/**
 * Shape of the optional `EARN_REWARDS` feature-flag payload. Carries the
 * advertised annual reward rate per network — a single value or a low–high
 * range (see {@link EarnRewardsRateInput}). The rate lives on the earn-rewards
 * flag — not on the promoted pool — because it's a property of the *offer*
 * (product/ops-owned, a financial claim, never derived or hardcoded), not of the
 * pool itself.
 */
export type EarnRewardsFeatureFlagPayload = {
  rate?: Partial<Record<CardanoPromotedNetworkKey, EarnRewardsRateInput>>;
};

/** Defensively extracts the earn-rewards payload from an untyped feature flag. */
export const parseEarnRewardsFeatureFlagPayload = (flag?: {
  payload?: unknown;
}): EarnRewardsFeatureFlagPayload => {
  const payload = flag?.payload;
  if (!payload || typeof payload !== 'object') return {};
  const { rate } = payload as EarnRewardsFeatureFlagPayload;
  if (!rate || typeof rate !== 'object') return {};
  return { rate };
};

/**
 * Prefix of the pool-selection id the earn-rewards flow hands the picker
 * (`cardanoStakePools.poolSelectionMade`), with the acting account appended —
 * `earn-rewards:<accountId>` — so a pick made for another flow, or another
 * account across a restart, can never be spent here.
 */
export const EARN_REWARDS_POOL_SELECTION_PREFIX = 'earn-rewards:';

/**
 * The selection slot this account's pick lands in. Keyed per account so a pick
 * made for one account — or for another flow — can never be spent here.
 * Minted here rather than at each surface so the producer and the consuming
 * side effect cannot drift apart.
 */
export const earnRewardsPoolSelectionId = (accountId: string): string =>
  `${EARN_REWARDS_POOL_SELECTION_PREFIX}${accountId}`;
