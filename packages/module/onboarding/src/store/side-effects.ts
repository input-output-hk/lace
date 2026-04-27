import { map } from 'rxjs';

import type { SideEffect } from '../';

const trackOnboardingCompletion: SideEffect = (
  { onboardingV2: { createWalletSuccess$ } },
  _,
  { actions },
) =>
  createWalletSuccess$.pipe(
    map(({ payload }) =>
      actions.analytics.trackEvent({
        eventName: payload.isRecovery
          ? 'onboarding | restore wallet | added'
          : 'onboarding | create wallet | added',
      }),
    ),
  );

export const sideEffects: SideEffect[] = [trackOnboardingCompletion];
