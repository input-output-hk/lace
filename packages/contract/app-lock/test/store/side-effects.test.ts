import { authenticationPromptActions } from '@lace-contract/authentication-prompt';
import { testSideEffect } from '@lace-lib/util-dev';
import { HexBytes, Milliseconds } from '@lace-sdk/util';
import { NEVER, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { INDEFINITE_INACTIVITY_TIMEOUT_MS } from '../../src/const';
import { appLockActions } from '../../src/index';
import {
  makeLockAfterInactivityTimeout,
  preparing,
  resetOnLastWalletRemoved,
  startUnlocking,
} from '../../src/store/side-effects';

/** A safe, small timeout used where tests verify the timer fires (avoids setTimeout overflow). */
const SAFE_TIMEOUT_MS = Milliseconds(60_000);

const actions = {
  ...appLockActions,
  ...authenticationPromptActions,
};

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
              selectIsWalletRepoMigrating$: cold('a', { a: false }),
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
              selectIsWalletRepoMigrating$: cold('a', { a: false }),
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
              selectIsWalletRepoMigrating$: cold('a', { a: false }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('--');
          },
        }),
      );
    });

    it('does not dispatch reset during wallet repo migration even when count drops to 0', () => {
      testSideEffect(
        resetOnLastWalletRemoved,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            wallets: {
              selectTotal$: cold('ab', { a: 1, b: 0 }),
              selectIsWalletRepoMigrating$: cold('a', { a: true }),
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
          build: () => makeLockAfterInactivityTimeout(NEVER, SAFE_TIMEOUT_MS),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('a', { a: true }),
              selectInactivityTimeout$: cold('a', { a: SAFE_TIMEOUT_MS }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe(`${SAFE_TIMEOUT_MS}ms a`, {
              a: actions.appLock.locked(),
            });
          },
        }),
      );
    });

    it('dispatches locked after the stored inactivity timeout', () => {
      testSideEffect(
        {
          build: ({ cold }) =>
            makeLockAfterInactivityTimeout(cold('a', { a: undefined })),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('a', { a: true }),
              selectInactivityTimeout$: cold('a', { a: SAFE_TIMEOUT_MS }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe(`${SAFE_TIMEOUT_MS}ms a`, {
              a: actions.appLock.locked(),
            });
          },
        }),
      );
    });

    it('never locks when timeout is INDEFINITE_INACTIVITY_TIMEOUT_MS', () => {
      testSideEffect(
        {
          build: ({ cold }) =>
            makeLockAfterInactivityTimeout(cold('a', { a: undefined })),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('a', { a: true }),
              selectInactivityTimeout$: cold('a', {
                a: INDEFINITE_INACTIVITY_TIMEOUT_MS,
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('--');
          },
        }),
      );
    });

    it('uses inactivity timeout stored in Redux state', () => {
      const customTimeoutMs = Milliseconds(120_000);
      testSideEffect(
        {
          build: ({ cold }) =>
            makeLockAfterInactivityTimeout(cold('a', { a: undefined })),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('a', { a: true }),
              selectInactivityTimeout$: cold('a', { a: customTimeoutMs }),
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
      const secondActivityFrameMs = 30001;
      const expectedLockFrameMs =
        Number(SAFE_TIMEOUT_MS) + secondActivityFrameMs;

      testSideEffect(
        {
          build: ({ cold }) =>
            makeLockAfterInactivityTimeout(
              cold('a 30000ms b', { a: undefined, b: undefined }),
              SAFE_TIMEOUT_MS,
            ),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('a', { a: true }),
              selectInactivityTimeout$: cold('a', { a: SAFE_TIMEOUT_MS }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            // First activity at frame 0, second at frame 30001.
            // debounce resets on second activity.
            // Lock fires after SAFE_TIMEOUT_MS following second activity.
            expectObservable(sideEffect$).toBe(`${expectedLockFrameMs}ms a`, {
              a: actions.appLock.locked(),
            });
          },
        }),
      );
    });

    it('uses platform default when Redux inactivity timeout is null (fresh install)', () => {
      const platformDefaultMs = Milliseconds(2 * 60 * 1000);
      testSideEffect(
        {
          build: ({ cold }) =>
            makeLockAfterInactivityTimeout(
              cold('a', { a: undefined }),
              platformDefaultMs,
            ),
        },
        ({ cold, expectObservable }) => ({
          stateObservables: {
            appLock: {
              isUnlocked$: cold('a', { a: true }),
              selectInactivityTimeout$: cold('a', { a: null }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe(`${platformDefaultMs}ms a`, {
              a: actions.appLock.locked(),
            });
          },
        }),
      );
    });
  });
});
