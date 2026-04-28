import {
  of,
  exhaustMap,
  merge,
  debounceTime,
  filter,
  switchMap,
  map,
  take,
} from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import type { ActionCreators, Selectors } from '../contract';
import type { LaceSideEffect } from '@lace-contract/module';

type SideEffect = LaceSideEffect<Selectors, ActionCreators>;

export const reloadAppInTheBackground: SideEffect = (
  { features: { updateFeatures$ } },
  { views: { selectOpenViews$ } },
  { actions },
) =>
  updateFeatures$.pipe(
    switchMap(() =>
      selectOpenViews$.pipe(
        filter(views => views.length === 0),
        take(1),
        map(() => actions.app.reloadApplication()),
      ),
    ),
  );

export const trackSession: SideEffect = (
  { views: { viewConnected$ } },
  { views: { selectOpenViews$ } },
  { actions },
) =>
  viewConnected$.pipe(
    // 1 session lasts until all views are closed
    exhaustMap(() => {
      const sessionId = uuidv4();
      return merge(
        of(
          actions.analytics.trackEvent({
            eventName: 'wallet | session start | Pageview',
            payload: {
              sessionId,
            },
          }),
        ),
        selectOpenViews$.pipe(
          debounceTime(500),
          filter(views => views.length === 0),
          take(1),
          map(() =>
            actions.analytics.trackEvent({
              eventName: 'wallet | session | end',
              payload: { sessionId },
            }),
          ),
        ),
      );
    }),
  );

export const appSideEffects = [reloadAppInTheBackground, trackSession];
