import { analyticsActions } from '@lace-contract/analytics';
import { onboardingV2Actions } from '@lace-contract/onboarding-v2';
import { WalletId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { sideEffects } from '../../src/store/side-effects';

const [trackOnboardingCompletion] = sideEffects;

const actions = {
  ...analyticsActions,
  ...onboardingV2Actions,
};

const walletId = WalletId('test-wallet-id');

describe('trackOnboardingCompletion', () => {
  it('emits restore wallet added event when isRecovery=true', () => {
    testSideEffect(trackOnboardingCompletion, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: cold('a', {
            a: actions.onboardingV2.createWalletSuccess({
              walletId,
              isRecovery: true,
            }),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'onboarding | restore wallet | added',
          }),
        });
      },
    }));
  });

  it('emits create wallet added event when isRecovery=false', () => {
    testSideEffect(trackOnboardingCompletion, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: cold('a', {
            a: actions.onboardingV2.createWalletSuccess({
              walletId,
              isRecovery: false,
            }),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'onboarding | create wallet | added',
          }),
        });
      },
    }));
  });

  it('emits one event per wallet creation', () => {
    testSideEffect(trackOnboardingCompletion, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: cold('ab', {
            a: actions.onboardingV2.createWalletSuccess({
              walletId,
              isRecovery: false,
            }),
            b: actions.onboardingV2.createWalletSuccess({
              walletId,
              isRecovery: true,
            }),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('ab', {
          a: actions.analytics.trackEvent({
            eventName: 'onboarding | create wallet | added',
          }),
          b: actions.analytics.trackEvent({
            eventName: 'onboarding | restore wallet | added',
          }),
        });
      },
    }));
  });
});
