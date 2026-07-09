import { nativeApplicationVersion } from 'expo-application';
import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';

import type { LaceInitSync } from '@lace-contract/module';
import type {
  PostHogClient,
  PostHogRelatedSideEffectDependencies,
} from '@lace-contract/posthog';

export const initializeSideEffectDependencies: LaceInitSync<
  PostHogRelatedSideEffectDependencies
> = ({
  runtime: {
    config: { postHogApiToken, postHogUrl },
  },
}) => {
  const posthog = new PostHog(postHogApiToken, {
    host: postHogUrl,
  });

  const posthogClient: PostHogClient = {
    captureEvent: ({ event, properties }) => {
      posthog.capture(event, properties);
    },
    getFeatureFlags: async () => {
      await posthog.reloadFeatureFlagsAsync().catch(() => undefined);
      const { flags = {}, payloads = {} } =
        posthog.getFeatureFlagsAndPayloads();

      return {
        featureFlags: flags,
        featureFlagPayloads: payloads,
      };
    },
    identify: (distinctId, properties) => {
      posthog.identify(distinctId, properties);
    },
  };

  return {
    posthog: posthogClient,
    getDefaultPostHogEventProperties: () => ({
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      appVersion: nativeApplicationVersion ?? 'unknown',
    }),
  };
};
