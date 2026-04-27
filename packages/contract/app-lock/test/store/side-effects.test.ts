import { authenticationPromptActions } from '@lace-contract/authentication-prompt';
import { testSideEffect } from '@lace-lib/util-dev';
import { HexBytes } from '@lace-sdk/util';
import { NEVER, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_INACTIVITY_TIMEOUT_MS,
  FEATURE_FLAG_APP_LOCK_INACTIVITY_TIMEOUT,
} from '../../src/const';
import { appLockActions } from '../../src/index';
import {
  makeLockAfterInactivityTimeout,
  preparing,
  resetOnLastWalletRemoved,
  startUnlocking,
} from '../../src/store/side-effects';

const actions = { ...appLockActions, ...authenticationPromptActions };

const loadedFeaturesWithoutAppLock = {
  modules: [],
  featureFlags: [],
};

const loadedFeaturesWithTimeout = (timeoutMs: number) => ({
  modules: [],
  featureFlags: [
    { key: FEATURE_FLAG_APP_LOCK_INACTIVITY_TIMEOUT, payload: { timeoutMs } },
  ],
});

describe('app-lock side effects', () => {
  describe('preparing', () => {
    it('dispatches noSetupRequired when sentinel exists', () => {
      testSideEffect(preparing, ({ cold, expectObservable }) => ({
        stateObservables: {
          appLock: {
            selectLockState$: cold('a', { a: { status: 'Preparing' } }),
            selectEncryptedSentinel$: cold('a', {
              a: HexBytes('encrypted-sentinel'),
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.appLock.noSetupRequired(),
          });
        },
      }));
    });

    it('dispatches initialSetupRequired when sentinel is null', () => {
      testSideEffect(preparing, ({ cold, expectObservable }) => ({
        stateObservables: {
          appLock: {
            selectLockState$: cold('a', { a: { status: 'Preparing' } }),
            selectEncryptedSentinel$: cold('a', { a: null }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.appLock.initialSetupRequired(),
          });
        },
      }));
    });
  });

  describe('resetOnLastWalletRemoved', () => {
    it('dispatches reset and clears deviceAuthReady when wallet count drops from 1 to 0', () => {
      testSideEffect(
        resetOnLastWalletRemoved,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            wallets: {
              selectTotal$: cold('ab', { a: 1, b: 0 }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-(ab)', {
              a: actions.appLock.reset(),
              b: actions.authenticationPrompt.setDeviceAuthReady({
                deviceAuthReady: false,
              }),
            });
          },
        }),
      );
    });

    it('does not dispatch reset when wallet count drops from 2 to 1', () => {
      testSideEffect(
        resetOnLastWalletRemoved,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            wallets: {
              selectTotal$: cold('ab', { a: 2, b: 1 }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('--');
          },
        }),
      );
    });

    it('does not dispatch reset when wallet count increases', () => {
      testSideEffect(
        resetOnLastWalletRemoved,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            wallets: {
              selectTotal$: cold('ab', { a: 0, b: 1 }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('--');
          },
        }),
      );
    });
  });

  describe('startUnlocking', () => {
    it('dispatches startUnlocking and unlockingSucceeded on successful authentication', () => {
      const authenticate = vi.fn().mockReturnValue(of(true));

      testSideEffect(startUnlocking, ({ cold, expectObservable }) => ({
        stateObservables: {
          appLock: {
            selectLockState$: cold('a', { a: { status: 'Locked' } }),
          },
        },
        dependencies: { actions, authenticate },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.appLock.startUnlocking(),
            b: actions.appLock.unlockingSucceeded(),
          });
        },
      }));

      expect(authenticate).toHaveBeenCalledWith({
        purpose: 'wallet-unlock',
        cancellable: false,
        message: 'authentication-prompt.message.wallet-lock',
        confirmButtonLabel: 'authentication-prompt.confirm-button-label',
      });
    });

    it('logs error and filters when authentication returns false', () => {
      const authenticate = vi.fn().mockReturnValue(of(false));
      const errorSpy = vi.spyOn(dummyLogger, 'error');

      testSideEffect(startUnlocking, ({ cold, expectObservable }) => ({
        stateObservables: {
          appLock: {
            selectLockState$: cold('a', { a: { status: 'Locked' } }),
          },
        },
        dependencies: { actions, authenticate, logger: dummyLogger },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.appLock.startUnlocking(),
          });
        },
      }));

      expect(errorSpy).toHaveBeenCalledWith(
        'Authentication of the App Lock should not be possible to be closed',
      );
    });
  });

  describe('makeLockAfterInactivityTimeout', () => {
    it('dispatches locked after timeout even without any activity events', () => {
      testSideEffect(
        {
          build: () => makeLockAfterInactivityTimeout(NEVER),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('a', { a: true }),
            },
            features: {
              selectLoadedFeatures$: cold('a', {
                a: loadedFeaturesWithoutAppLock,
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe(
              `${DEFAULT_INACTIVITY_TIMEOUT_MS}ms a`,
              {
                a: actions.appLock.locked(),
              },
            );
          },
        }),
      );
    });

    it('dispatches locked after default 60s of inactivity when no feature flag', () => {
      testSideEffect(
        {
          build: ({ cold }) =>
            makeLockAfterInactivityTimeout(cold('a', { a: undefined })),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('a', { a: true }),
            },
            features: {
              selectLoadedFeatures$: cold('a', {
                a: loadedFeaturesWithoutAppLock,
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe(
              `${DEFAULT_INACTIVITY_TIMEOUT_MS}ms a`,
              {
                a: actions.appLock.locked(),
              },
            );
          },
        }),
      );
    });

    it('uses inactivity timeout from feature flag payload', () => {
      const customTimeoutMs = 120_000;
      testSideEffect(
        {
          build: ({ cold }) =>
            makeLockAfterInactivityTimeout(cold('a', { a: undefined })),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('a', { a: true }),
            },
            features: {
              selectLoadedFeatures$: cold('a', {
                a: loadedFeaturesWithTimeout(customTimeoutMs),
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe(`${customTimeoutMs}ms a`, {
              a: actions.appLock.locked(),
            });
          },
        }),
      );
    });

    it('resets the timer on subsequent activity', () => {
      testSideEffect(
        {
          build: ({ cold }) =>
            makeLockAfterInactivityTimeout(
              cold('a 30000ms b', { a: undefined, b: undefined }),
            ),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('a', { a: true }),
            },
            features: {
              selectLoadedFeatures$: cold('a', {
                a: loadedFeaturesWithoutAppLock,
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            // First activity at frame 0, second at frame 30001.
            // debounce resets on second activity.
            // Lock fires 60000ms after second activity = frame 90001.
            expectObservable(sideEffect$).toBe('90001ms a', {
              a: actions.appLock.locked(),
            });
          },
        }),
      );
    });

    it('falls back to default timeout when payload is invalid', () => {
      testSideEffect(
        {
          build: ({ cold }) =>
            makeLockAfterInactivityTimeout(cold('a', { a: undefined })),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('a', { a: true }),
            },
            features: {
              selectLoadedFeatures$: cold('a', {
                a: {
                  modules: [],
                  featureFlags: [
                    {
                      key: FEATURE_FLAG_APP_LOCK_INACTIVITY_TIMEOUT,
                      payload: { timeoutMs: -1 },
                    },
                  ],
                },
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe(
              `${DEFAULT_INACTIVITY_TIMEOUT_MS}ms a`,
              {
                a: actions.appLock.locked(),
              },
            );
          },
        }),
      );
    });
  });
});
