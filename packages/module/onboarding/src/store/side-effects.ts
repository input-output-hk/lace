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
        payload: {
          walletType: payload.walletType,
          blockchains: payload.blockchains,
        },
      }),
    ),
  );

const trackOnboardingFailure: SideEffect = (
  { onboardingV2: { createWalletFailure$ } },
  _,
  { actions },
) =>
  createWalletFailure$.pipe(
    map(({ payload }) =>
      actions.analytics.trackEvent({
        eventName: 'onboarding | wallet | failure',
        payload: {
          reason: payload.reason ?? 'unknown',
        },
      }),
    ),
  );

export const sideEffects: SideEffect[] = [
  trackOnboardingCompletion,
  trackOnboardingFailure,
];
