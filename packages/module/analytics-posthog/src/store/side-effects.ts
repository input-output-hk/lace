import { toEmpty } from '@cardano-sdk/util-rxjs';
import { distinctUntilChanged, EMPTY, filter, map, tap } from 'rxjs';

import type { SideEffect } from '..';

export const initializePostHogAnalyticsDependencies: SideEffect = (
  _,
  __,
  { initializePostHogAnalytics, posthog, getDefaultPostHogEventProperties },
) => {
  initializePostHogAnalytics(posthog, getDefaultPostHogEventProperties);
  return EMPTY;
};

export const identifyUser: SideEffect = (
  _,
  { analytics: { selectAnalyticsUser$ } },
  { posthog },
) =>
  selectAnalyticsUser$.pipe(
    distinctUntilChanged(),
    filter(Boolean),
    tap(({ id }) => {
      posthog.identify(id);
    }),
    toEmpty,
  );

export const trackFeatureView: SideEffect = (
  { features: { featureView$ } },
  _,
  { actions },
) =>
  featureView$.pipe(
    map(({ payload }) =>
      actions.analytics.trackEvent({
        eventName: '$feature_view',
        payload: { feature_flag: payload },
      }),
    ),
  );

export const trackFeatureInteraction: SideEffect = (
  { features: { featureInteraction$ } },
  _,
  { actions },
) =>
  featureInteraction$.pipe(
    map(({ payload }) =>
      actions.analytics.trackEvent({
        eventName: '$feature_interaction',
        payload: {
          feature_flag: payload,
          $set: { [`$feature_interaction/${payload}`]: true },
        },
      }),
    ),
  );

export const posthogSideEffects: SideEffect[] = [
  identifyUser,
  initializePostHogAnalyticsDependencies,
  trackFeatureView,
  trackFeatureInteraction,
];
