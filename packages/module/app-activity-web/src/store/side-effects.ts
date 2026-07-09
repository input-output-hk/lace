import {
  distinctUntilChanged,
  filter,
  ignoreElements,
  map,
  pairwise,
  tap,
} from 'rxjs';

import { featureFlagRefreshTrigger$ } from './refresh-trigger';

import type { SideEffect } from '..';

export const refreshFeatureFlagsOnAllViewsClosed: SideEffect = (
  _,
  { views: { selectOpenViews$ } },
) =>
  selectOpenViews$.pipe(
    map(views => views.length),
    distinctUntilChanged(),
    pairwise(),
    filter(([previous, current]) => previous > 0 && current === 0),
    tap(() => {
      featureFlagRefreshTrigger$.next();
    }),
    ignoreElements(),
  );

export const sideEffects: SideEffect[] = [refreshFeatureFlagsOnAllViewsClosed];
