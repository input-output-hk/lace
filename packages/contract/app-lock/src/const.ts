import { FeatureFlagKey } from '@lace-contract/feature';
import { Milliseconds } from '@lace-sdk/util';

export const FEATURE_FLAG_APP_LOCK_INACTIVITY_TIMEOUT = FeatureFlagKey(
  'APP_LOCK_INACTIVITY_TIMEOUT',
);

export const DEFAULT_INACTIVITY_TIMEOUT_MS = Milliseconds(60 * 1000);
