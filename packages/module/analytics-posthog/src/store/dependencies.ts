import { filterRedacted } from '@lace-lib/util-redacted';
import { ReplaySubject, map, tap } from 'rxjs';

import type { AnalyticsProvider } from '@lace-contract/analytics';
import type { LaceInitSync } from '@lace-contract/module';
import type {
  GetDefaultPostHogEventProperties,
  PostHogClient,
} from '@lace-contract/posthog';

export interface PostHogAnalyticsDependencies {
  initializePostHogAnalytics: (
    posthogClient: PostHogClient,
    getDefaultEventProperties: GetDefaultPostHogEventProperties,
  ) => void;
}

export const initializeDependencies: LaceInitSync<
  AnalyticsProvider & PostHogAnalyticsDependencies
> = ({
  runtime: {
    features: {
      loaded: { featureFlags: loadedFeatureFlags },
    },
  },
}) => {
  // send loaded feature flags with each event (not the ones 'available' for the user)
  const featureFlagProperties = loadedFeatureFlags.reduce(
    (properties, featureFlag) => {
      properties[`$feature/${featureFlag.key}`] = true;
      return properties;
    },
    {} as Record<string, true>,
  );

  const posthog$ = new ReplaySubject<{
    posthogClient: PostHogClient;
    getDefaultEventProperties: GetDefaultPostHogEventProperties;
  }>(1);

  return {
    trackAnalyticsEvent: ({ eventName, payload }, { user }) =>
      posthog$.pipe(
        tap(({ getDefaultEventProperties, posthogClient }) => {
          posthogClient.captureEvent({
            distinctId: user.id,
            event: eventName,
            properties: {
              ...(payload ? (filterRedacted(payload) as typeof payload) : {}),
              ...featureFlagProperties,
              ...getDefaultEventProperties(),
            },
          });
        }),
        map(() => void 0),
      ),
    initializePostHogAnalytics: (posthogClient, getDefaultEventProperties) => {
      posthog$.next({
        getDefaultEventProperties,
        posthogClient,
      });
    },
  };
};
