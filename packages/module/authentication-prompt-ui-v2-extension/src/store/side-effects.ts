import { filter, map, merge } from 'rxjs';

import type { SideEffect } from '../';

export const trackAppLockEvents: SideEffect = (
  {
    authenticationPrompt: {
      confirmedBiometric$,
      confirmedPassword$,
      switchToPassword$,
      verifiedBiometric$,
      verifiedPassword$,
    },
  },
  _,
  { actions },
) =>
  merge(
    confirmedBiometric$.pipe(
      map(() =>
        actions.analytics.trackEvent({
          eventName: 'app lock | biometric | attempt',
        }),
      ),
    ),
    confirmedPassword$.pipe(
      map(() =>
        actions.analytics.trackEvent({
          eventName: 'app lock | pin | attempt',
        }),
      ),
    ),
    switchToPassword$.pipe(
      map(() =>
        actions.analytics.trackEvent({
          eventName: 'app lock | biometric | fallback to pin',
        }),
      ),
    ),
    verifiedBiometric$.pipe(
      filter(({ payload }) => payload.success),
      map(() =>
        actions.analytics.trackEvent({
          eventName: 'app lock | biometric | success',
        }),
      ),
    ),
    verifiedBiometric$.pipe(
      filter(({ payload }) => !payload.success),
      map(() =>
        actions.analytics.trackEvent({
          eventName: 'app lock | biometric | failed',
        }),
      ),
    ),
    verifiedPassword$.pipe(
      filter(({ payload }) => payload.success),
      map(() =>
        actions.analytics.trackEvent({
          eventName: 'app lock | pin | success',
        }),
      ),
    ),
    verifiedPassword$.pipe(
      filter(({ payload }) => !payload.success),
      map(() =>
        actions.analytics.trackEvent({
          eventName: 'app lock | pin | failed',
        }),
      ),
    ),
  );

export const sideEffects: SideEffect[] = [trackAppLockEvents];
