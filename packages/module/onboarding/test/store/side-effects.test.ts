import { analyticsActions } from '@lace-contract/analytics';
import { onboardingV2Actions } from '@lace-contract/onboarding-v2';
import { WalletId, WalletType } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { sideEffects } from '../../src/store/side-effects';

import type { BlockchainName } from '@lace-lib/util-store';

const [trackOnboardingCompletion, trackOnboardingFailure] = sideEffects;

const actions = {
  ...analyticsActions,
  ...onboardingV2Actions,
};

const walletId = WalletId('test-wallet-id');
const cardanoOnly: BlockchainName[] = ['Cardano' as BlockchainName];
const cardanoAndMidnight: BlockchainName[] = [
  'Cardano' as BlockchainName,
  'Midnight' as BlockchainName,
];

describe('trackOnboardingCompletion', () => {
  it('emits restore wallet added event with walletType and blockchains when isRecovery=true', () => {
    testSideEffect(trackOnboardingCompletion, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: cold('a', {
            a: actions.onboardingV2.createWalletSuccess({
              walletId,
              isRecovery: true,
              walletType: WalletType.InMemory,
              blockchains: cardanoOnly,
            }),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'onboarding | restore wallet | added',
            payload: {
              walletType: WalletType.InMemory,
              blockchains: cardanoOnly,
            },
          }),
        });
      },
    }));
  });

  it('emits create wallet added event with walletType and blockchains when isRecovery=false', () => {
    testSideEffect(trackOnboardingCompletion, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: cold('a', {
            a: actions.onboardingV2.createWalletSuccess({
              walletId,
              isRecovery: false,
              walletType: WalletType.InMemory,
              blockchains: cardanoAndMidnight,
            }),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'onboarding | create wallet | added',
            payload: {
              walletType: WalletType.InMemory,
              blockchains: cardanoAndMidnight,
            },
          }),
        });
      },
    }));
  });

  it('emits one event per wallet creation, propagating the source walletType', () => {
    testSideEffect(trackOnboardingCompletion, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: cold('ab', {
            a: actions.onboardingV2.createWalletSuccess({
              walletId,
              isRecovery: false,
              walletType: WalletType.InMemory,
              blockchains: cardanoOnly,
            }),
            b: actions.onboardingV2.createWalletSuccess({
              walletId,
              isRecovery: true,
              walletType: WalletType.HardwareLedger,
              blockchains: cardanoOnly,
            }),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('ab', {
          a: actions.analytics.trackEvent({
            eventName: 'onboarding | create wallet | added',
            payload: {
              walletType: WalletType.InMemory,
              blockchains: cardanoOnly,
            },
          }),
          b: actions.analytics.trackEvent({
            eventName: 'onboarding | restore wallet | added',
            payload: {
              walletType: WalletType.HardwareLedger,
              blockchains: cardanoOnly,
            },
          }),
        });
      },
    }));
  });
});

describe('trackOnboardingFailure', () => {
  it('emits wallet failure event with classified reason', () => {
    testSideEffect(trackOnboardingFailure, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        onboardingV2: {
          createWalletFailure$: cold('a', {
            a: actions.onboardingV2.createWalletFailure({
              reason: 'biometric-auth-failed',
            }),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'onboarding | wallet | failure',
            payload: { reason: 'biometric-auth-failed' },
          }),
        });
      },
    }));
  });

  it('emits wallet failure event with unknown reason when none provided', () => {
    testSideEffect(trackOnboardingFailure, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        onboardingV2: {
          createWalletFailure$: cold('a', {
            a: actions.onboardingV2.createWalletFailure({}),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'onboarding | wallet | failure',
            payload: { reason: 'unknown' },
          }),
        });
      },
    }));
  });

  it('emits one failure event per createWalletFailure dispatch', () => {
    testSideEffect(trackOnboardingFailure, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        onboardingV2: {
          createWalletFailure$: cold('ab', {
            a: actions.onboardingV2.createWalletFailure({
              reason: 'creation-failed',
            }),
            b: actions.onboardingV2.createWalletFailure({
              reason: 'invalid-input',
            }),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('ab', {
          a: actions.analytics.trackEvent({
            eventName: 'onboarding | wallet | failure',
            payload: { reason: 'creation-failed' },
          }),
          b: actions.analytics.trackEvent({
            eventName: 'onboarding | wallet | failure',
            payload: { reason: 'invalid-input' },
          }),
        });
      },
    }));
  });
});
