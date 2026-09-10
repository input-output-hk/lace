import { FeatureFlagKey } from '@lace-contract/feature';

import type {
  CardanoPromotedNetworkKey,
  PromotedInformation,
} from '@lace-contract/cardano-context';

export const FEATURE_FLAG_STAKING_CENTER = FeatureFlagKey('STAKING_CENTER');

/** A single Lace-promoted stake pool from the STAKING_CENTER feature-flag payload. */
export type PromotedPool = {
  id: string;
  additional_information?: PromotedInformation;
};

/** Shape of the optional `STAKING_CENTER` feature-flag payload. */
export type StakingCenterFeatureFlagPayload = {
  promotedPools?: Partial<Record<CardanoPromotedNetworkKey, PromotedPool[]>>;
};

/** Defensively extracts the `promotedPools` payload from an untyped feature flag. */
export const parseStakingFeatureFlagPayload = (flag?: {
  payload?: unknown;
}): StakingCenterFeatureFlagPayload => {
  const payload = flag?.payload;
  if (!payload || typeof payload !== 'object') return {};
  const { promotedPools } = payload as StakingCenterFeatureFlagPayload;
  if (!promotedPools || typeof promotedPools !== 'object') return {};
  return { promotedPools };
};
