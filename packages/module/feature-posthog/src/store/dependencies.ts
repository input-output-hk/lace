import { FeatureFlagKey } from '@lace-contract/feature';
import { Seconds } from '@lace-lib/util';
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
    featureFlagRefreshTrigger$: Observable<void>,
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
    featureFlagRefreshTrigger$: Observable<void>;
  } | null>(null);

  const featureFlags$ = posthog$.pipe(
    filter(Boolean),
    switchMap(({ distinctId, posthog, featureFlagRefreshTrigger$ }) =>
      merge(
        of(-1),
        interval(Seconds.toMilliseconds(featureFlagCheckFrequency)),
        featureFlagRefreshTrigger$,
      ).pipe(
        exhaustMap(() =>
          from(posthog.getFeatureFlags(distinctId)).pipe(
            catchError(error => {
              logger.error('Failed to fetch feature flags', error);
              return EMPTY;
            }),
          ),
        ),
        filter(posthogResponse => !!posthogResponse.featureFlags),
        map(posthogResponse => {
          const featureFlags = posthogResponse.featureFlags ?? {};

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
      ),
    ),
  );

  return {
    featureFlags$,
    initializePostHogFeatureDependencies: (
      posthog,
      distinctId$,
      featureFlagRefreshTrigger$,
    ) =>
      distinctId$
        .pipe(
          map(distinctId => ({
            posthog,
            distinctId,
            featureFlagRefreshTrigger$,
          })),
        )
        .subscribe(posthog$),
  };
};
