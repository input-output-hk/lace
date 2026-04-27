import { PostHog } from 'posthog-node';

import { getDefaultPosthogProperties } from './posthog-properties';

import type { LaceInitSync } from '@lace-contract/module';
import type { PostHogRelatedSideEffectDependencies } from '@lace-contract/posthog';

const FEATURE_FLAGS_POLLING_INTERVAL_MS = 1800000; // 30 minutes

export const initializeSideEffectDependencies: LaceInitSync<
  PostHogRelatedSideEffectDependencies
> = ({
  runtime: {
    config: { postHogApiToken, postHogUrl },
  },
}) => {
  const postHog = new PostHog(postHogApiToken, {
    host: postHogUrl,
    flushAt: 5,
    flushInterval: 500,
    featureFlagsPollingInterval: FEATURE_FLAGS_POLLING_INTERVAL_MS,
    disableGeoip: false,
  });

  return {
    posthog: {
      captureEvent: ({ distinctId, event, properties }) => {
        postHog.capture({ distinctId, event, properties });
      },
      getFeatureFlags: async distinctId =>
        postHog.getAllFlagsAndPayloads(distinctId),
      // We do not need to identify user in the extension environment
      // as we use posthog-node which requires associating user at the time
      // of capturing event or reading feature flags (the distinctId property)
      identify: () => {},
    },
    getDefaultPostHogEventProperties: () =>
      getDefaultPosthogProperties(globalThis.navigator, globalThis.location),
  };
};
