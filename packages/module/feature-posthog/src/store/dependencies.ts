import { FeatureFlagKey } from '@lace-contract/feature';
import { Seconds } from '@lace-sdk/util';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  exhaustMap,
  filter,
  from,
  interval,
  map,
  merge,
  of,
  switchMap,
} from 'rxjs';

import type { FeatureFlag, FeatureFlagProvider } from '@lace-contract/feature';
import type { LaceInitSync } from '@lace-contract/module';
import type { PostHogClient } from '@lace-contract/posthog';
import type { Observable } from 'rxjs';

export interface PostHogFeatureDependencies {
  initializePostHogFeatureDependencies: (
    posthog: PostHogClient,
    distinctId$: Observable<string>,
  ) => void;
}

export const initializeDependencies: LaceInitSync<
  FeatureFlagProvider & PostHogFeatureDependencies
> = (
  {
    runtime: {
      config: { featureFlagCheckFrequency },
    },
  },
  { logger },
) => {
  const posthog$ = new BehaviorSubject<{
    distinctId: string;
    posthog: PostHogClient;
  } | null>(null);

  const featureFlags$ = posthog$.pipe(
    filter(Boolean),
    switchMap(({ distinctId, posthog }) =>
      merge(
        of(-1),
        interval(Seconds.toMilliseconds(featureFlagCheckFrequency)),
      ).pipe(
        exhaustMap(() => from(posthog.getFeatureFlags(distinctId))),
        catchError(error => {
          logger.error('Failed to fetch feature flags', error);
          return EMPTY;
        }),
        map(posthogResponse => {
          if (!posthogResponse.featureFlags) {
            // PostHog v5 may return a partial response (e.g. cold start/no flags yet).
            // Treat this as "no active flags" and wait for the next polling cycle.
            return [];
          }

          const featureFlags = posthogResponse.featureFlags;

          return Object.entries(featureFlags)
            .filter(([_, value]) => !!value)
            .map(([key]): FeatureFlag => {
              const payload = posthogResponse.featureFlagPayloads?.[key];
              if (payload) {
                return {
                  key: FeatureFlagKey(key),
                  payload,
                };
              }
              return { key: FeatureFlagKey(key) };
            });
        }),
        // if posthog can't connect, it will return flags it has locally, which can be empty on initial load
        filter(featureFlags => featureFlags.length > 0),
      ),
    ),
  );

  return {
    featureFlags$,
    initializePostHogFeatureDependencies: (posthog, distinctId$) =>
      distinctId$
        .pipe(map(distinctId => ({ posthog, distinctId })))
        .subscribe(posthog$),
  };
};
