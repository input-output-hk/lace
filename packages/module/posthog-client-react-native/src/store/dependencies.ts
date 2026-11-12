import { nativeApplicationVersion } from 'expo-application';
import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';

import type { LaceInitSync } from '@lace-contract/module';
import type {
  PostHogClient,
  PostHogRelatedSideEffectDependencies,
} from '@lace-contract/posthog';

// The SDK normalizes incomplete/quota-limited responses to empty flags, so validate before it updates its cache.
class PostHogWithValidatedFlags extends PostHog {
  public override async fetch(...args: Parameters<PostHog['fetch']>) {
    const response = await super.fetch(...args);
    if (!args[0].includes('/flags/')) return response;

    return {
      status: response.status,
      text: async () => response.text(),
      json: async () => {
        const body = (await response.json()) as Record<string, unknown> | null;
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          throw new Error('PostHog returned an invalid feature flag response');
        }
        const flags = 'flags' in body ? body.flags : body.featureFlags;
        if (
          response.status < 200 ||
          response.status >= 300 ||
          !flags ||
          typeof flags !== 'object' ||
          Array.isArray(flags) ||
          body.errorsWhileComputingFlags ||
          (body.quotaLimited != null &&
            (!Array.isArray(body.quotaLimited) ||
              body.quotaLimited.includes('feature_flags')))
        ) {
          throw new Error(
            'PostHog returned incomplete or partial feature flags',
          );
        }
        if (
          Object.values(flags).some((value: unknown) => {
            if ('flags' in body) {
              if (!value || typeof value !== 'object' || Array.isArray(value))
                return true;
              const detail = value as Record<string, unknown>;
              value = detail.variant ?? detail.enabled;
            }
            return typeof value !== 'boolean' && typeof value !== 'string';
          })
        ) {
          throw new Error('PostHog returned incomplete feature flag values');
        }
        return body;
      },
    };
  }
}

export const initializeSideEffectDependencies: LaceInitSync<
  PostHogRelatedSideEffectDependencies
> = ({
  runtime: {
    config: { postHogApiToken, postHogUrl },
  },
}) => {
  const posthog = new PostHogWithValidatedFlags(postHogApiToken, {
    host: postHogUrl,
    customAppProperties: properties => ({
      ...properties,
      platform: Platform.OS,
    }),
  });
  posthog.setPersonPropertiesForFlags({ platform: Platform.OS }, false);

  const posthogClient: PostHogClient = {
    captureEvent: ({ event, properties }) => {
      posthog.capture(event, properties);
    },
    getFeatureFlags: async () => {
      const refreshedFlags = await posthog.reloadFeatureFlagsAsync();
      if (refreshedFlags === undefined) return {};

      const { flags = {}, payloads = {} } =
        posthog.getFeatureFlagsAndPayloads();

      return {
        featureFlags: flags,
        featureFlagPayloads: payloads,
      };
    },
    identify: (distinctId, properties) => {
      posthog.identify(distinctId, { ...properties, platform: Platform.OS });
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
