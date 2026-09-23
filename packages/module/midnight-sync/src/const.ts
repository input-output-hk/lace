import { FeatureFlagKey } from '@lace-contract/feature';

export const FEATURE_FLAG_MIDNIGHT = FeatureFlagKey('BLOCKCHAIN_MIDNIGHT');
export const FEATURE_FLAG_MIDNIGHT_UNSHIELDED = FeatureFlagKey(
  'BLOCKCHAIN_MIDNIGHT_UNSHIELDED',
);
/**
 * Shows confirmed activity rows that have no unshielded section. Their values
 * are encrypted or absent, so they render without an amount and with a 1970
 * placeholder date (LW-15261). Off by default, which hides them; enable to get
 * the pre-suppression behaviour back while the product decision is open.
 */
export const FEATURE_FLAG_MIDNIGHT_SHIELDED_ACTIVITY_ROWS = FeatureFlagKey(
  'BLOCKCHAIN_MIDNIGHT_SHIELDED_ACTIVITY_ROWS',
);
