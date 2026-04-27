import { testSideEffect } from '@lace-lib/util-dev';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { authenticationPromptActions as actions } from '../../src';
import { makeAutoConfirmBiometricFromOpenPassword } from '../../src/store/side-effects/auto-confirm-biometric-from-open-password';

import type {
  AuthenticationPromptSliceState,
  AuthenticationPromptSliceStateOpen,
  AuthenticationPromptSliceStatePreparing,
  Config,
  DeferBiometricPromptUntilActiveExtension,
} from '../../src';

// Mock @lace-lib/navigation to avoid react-navigation loading issues
vi.mock('@lace-lib/navigation', () => ({
  navigationReferences: {},
  navigateAndReset: vi.fn(),
  navigate: vi.fn(),
}));

const config: Config = {
  purpose: 'wallet-unlock',
  confirmButtonLabel: 'authentication-prompt.confirm-button-label',
  message: 'authentication-prompt.message.wallet-lock',
};

const openBiometricState: AuthenticationPromptSliceStateOpen = {
  config,
  status: 'OpenBiometric',
  authSecretError: false,
};

const openPasswordState: AuthenticationPromptSliceStateOpen = {
  config,
  status: 'OpenPassword',
  authSecretError: false,
};

const preparingState: AuthenticationPromptSliceStatePreparing = {
  config,
  status: 'Preparing',
};

describe('makeAutoConfirmBiometricFromOpenPassword', () => {
  it('returns EMPTY on web platform', () => {
    testSideEffect(
      makeAutoConfirmBiometricFromOpenPassword({ platform: 'web' }),
      ({ cold, expectObservable }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('|');
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold<AuthenticationPromptSliceState>('a', {
              a: openBiometricState,
            }),
          },
        },
      }),
    );
  });

  it('returns EMPTY on web-extension platform', () => {
    testSideEffect(
      makeAutoConfirmBiometricFromOpenPassword({
        platform: 'web-extension',
      }),
      ({ cold, expectObservable }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('|');
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold<AuthenticationPromptSliceState>('a', {
              a: openBiometricState,
            }),
          },
        },
      }),
    );
  });

  it('dispatches confirmedBiometric when state transitions to OpenBiometric on ios', () => {
    testSideEffect(
      makeAutoConfirmBiometricFromOpenPassword({ platform: 'ios' }),
      ({ cold, expectObservable }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.authenticationPrompt.confirmedBiometric(),
          });
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold<AuthenticationPromptSliceState>('a', {
              a: openBiometricState,
            }),
          },
        },
      }),
    );
  });

  it('dispatches confirmedBiometric when state transitions to OpenBiometric on android', () => {
    testSideEffect(
      makeAutoConfirmBiometricFromOpenPassword({ platform: 'android' }),
      ({ cold, expectObservable }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.authenticationPrompt.confirmedBiometric(),
          });
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold<AuthenticationPromptSliceState>('a', {
              a: openBiometricState,
            }),
          },
        },
      }),
    );
  });

  it('does not emit when not entering OpenBiometric state', () => {
    testSideEffect(
      makeAutoConfirmBiometricFromOpenPassword({ platform: 'ios' }),
      ({ cold, expectObservable }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('');
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold<AuthenticationPromptSliceState>('a', {
              a: openPasswordState,
            }),
          },
        },
      }),
    );
  });

  it('emits only once on the first entry to OpenBiometric (subsequent same-status emissions filtered)', () => {
    testSideEffect(
      makeAutoConfirmBiometricFromOpenPassword({ platform: 'ios' }),
      ({ cold, expectObservable }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.authenticationPrompt.confirmedBiometric(),
          });
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold<AuthenticationPromptSliceState>('ab', {
              a: openBiometricState,
              b: openBiometricState,
            }),
          },
        },
      }),
    );
  });

  it('re-emits after status changes and re-enters OpenBiometric', () => {
    testSideEffect(
      makeAutoConfirmBiometricFromOpenPassword({ platform: 'ios' }),
      ({ cold, expectObservable }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a-b', {
            a: actions.authenticationPrompt.confirmedBiometric(),
            b: actions.authenticationPrompt.confirmedBiometric(),
          });
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold<AuthenticationPromptSliceState>('abc', {
              a: openBiometricState,
              b: openPasswordState,
              c: openBiometricState,
            }),
          },
        },
      }),
    );
  });

  describe('when deferBiometricExtension is provided', () => {
    it('waits for the extension signal before dispatching confirmedBiometric', () => {
      const waitUntilAllowed$ = new Subject<void>();
      const deferBiometricExtension: DeferBiometricPromptUntilActiveExtension =
        {
          createWaitUntilBiometricPromptAllowed: vi.fn(() => waitUntilAllowed$),
        };

      const emittedActions: unknown[] = [];
      const stateSubject = new Subject<AuthenticationPromptSliceState>();

      const sub = makeAutoConfirmBiometricFromOpenPassword({
        platform: 'ios',
        deferBiometricExtension,
      })(
        {} as never,
        {
          authenticationPrompt: { selectState$: stateSubject.asObservable() },
        } as never,
        { actions } as never,
      ).subscribe(a => emittedActions.push(a));

      stateSubject.next(openBiometricState);

      expect(emittedActions).toHaveLength(0);
      expect(
        deferBiometricExtension.createWaitUntilBiometricPromptAllowed,
      ).toHaveBeenCalledTimes(1);

      waitUntilAllowed$.next();

      expect(emittedActions).toEqual([
        actions.authenticationPrompt.confirmedBiometric(),
      ]);

      sub.unsubscribe();
    });

    it('only takes the first signal from the extension per OpenBiometric entry', () => {
      const waitUntilAllowed$ = new Subject<void>();
      const deferBiometricExtension: DeferBiometricPromptUntilActiveExtension =
        {
          createWaitUntilBiometricPromptAllowed: vi.fn(() => waitUntilAllowed$),
        };

      const emittedActions: unknown[] = [];
      const stateSubject = new Subject<AuthenticationPromptSliceState>();

      const sub = makeAutoConfirmBiometricFromOpenPassword({
        platform: 'ios',
        deferBiometricExtension,
      })(
        {} as never,
        {
          authenticationPrompt: { selectState$: stateSubject.asObservable() },
        } as never,
        { actions } as never,
      ).subscribe(a => emittedActions.push(a));

      stateSubject.next(openBiometricState);
      waitUntilAllowed$.next();
      waitUntilAllowed$.next();

      expect(emittedActions).toEqual([
        actions.authenticationPrompt.confirmedBiometric(),
      ]);

      sub.unsubscribe();
    });

    it('does not dispatch if the extension signal never arrives', () => {
      const waitUntilAllowed$ = new Subject<void>();
      const deferBiometricExtension: DeferBiometricPromptUntilActiveExtension =
        {
          createWaitUntilBiometricPromptAllowed: vi.fn(() => waitUntilAllowed$),
        };

      const emittedActions: unknown[] = [];
      const stateSubject = new Subject<AuthenticationPromptSliceState>();

      const sub = makeAutoConfirmBiometricFromOpenPassword({
        platform: 'ios',
        deferBiometricExtension,
      })(
        {} as never,
        {
          authenticationPrompt: {
            selectState$: stateSubject.asObservable(),
          },
        } as never,
        { actions } as never,
      ).subscribe(a => emittedActions.push(a));

      stateSubject.next(preparingState);
      stateSubject.next(openBiometricState);

      expect(emittedActions).toHaveLength(0);

      sub.unsubscribe();
    });
  });
});
