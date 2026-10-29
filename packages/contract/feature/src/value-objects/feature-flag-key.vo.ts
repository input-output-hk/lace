import type { Tagged } from 'type-fest';

/** The key of a feature flag, which modules and app config refer to it by. */
export type FeatureFlagKey = Tagged<string, 'FeatureFlag'>;
/** Types a string as a feature flag's key. It checks nothing. */
export const FeatureFlagKey = (featureFlagKey: string) =>
  featureFlagKey as FeatureFlagKey;
