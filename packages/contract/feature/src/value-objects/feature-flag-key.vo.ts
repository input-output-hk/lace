import type { Tagged } from 'type-fest';

export type FeatureFlagKey = Tagged<string, 'FeatureFlag'>;
export const FeatureFlagKey = (featureFlagKey: string) =>
  featureFlagKey as FeatureFlagKey;
