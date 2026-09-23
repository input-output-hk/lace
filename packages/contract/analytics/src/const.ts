import { FeatureFlagKey } from '@lace-contract/feature';

export const ANALYTICS_USER_DOC_ID = 'analytics-user';

/**
 * Gates the opt-in requirement, so consent is a per-app posture rather than a
 * platform-wide behaviour change.
 *
 * Absent (every app that ships today): a user id is minted at boot and every
 * event is reported, unchanged.
 *
 * Present: no id is minted and nothing is reported until the user grants
 * consent; revoking discards the id and the queued events.
 */
export const ANALYTICS_CONSENT_FEATURE_FLAG = FeatureFlagKey(
  'ANALYTICS_CONSENT_REQUIRED',
);
