import type { JsonType } from '@lace-lib/util-store';

// Minimal shared PostHog client type for use in both extension and react-native environments
export type PostHogClient = {
  captureEvent: (args: {
    distinctId: string;
    event: string;
    properties?: Record<string, JsonType>;
  }) => void;
  getFeatureFlags: (distinctId: string) => Promise<{
    featureFlags?: Record<string, boolean | string>;
    featureFlagPayloads?: Record<string, JsonType>;
  }>;
  identify: (distinctId: string) => void;
};

export type GetDefaultPostHogEventProperties = () => Record<string, JsonType>;

export type PostHogRelatedAppConfig = {
  postHogApiToken: string;
  postHogUrl: string;
};

export type PostHogRelatedSideEffectDependencies = {
  posthog: PostHogClient;
  getDefaultPostHogEventProperties: GetDefaultPostHogEventProperties;
};
