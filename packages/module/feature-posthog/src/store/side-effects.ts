import { distinctUntilChanged, EMPTY, filter, map } from 'rxjs';

import type { SideEffect } from '..';

export const initializePostHogFeatureDependencies: SideEffect = (
  _,
  { analytics: { selectAnalyticsUser$ } },
  { posthog, initializePostHogFeatureDependencies, featureFlagRefreshTrigger$ },
) => {
  initializePostHogFeatureDependencies(
    posthog,
    selectAnalyticsUser$.pipe(
      filter(Boolean),
      map(user => user?.id),
      distinctUntilChanged(),
    ),
    featureFlagRefreshTrigger$,
  );
  return EMPTY;
};

export const posthogSideEffects: SideEffect[] = [
  initializePostHogFeatureDependencies,
];
