import { testSideEffect } from '@lace-lib/util-dev';
import { BehaviorSubject, NEVER, Subject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  authenticationPromptActions as actions,
  getTestAuthSecretDeps,
} from '../../src';
import * as authSecretAccessor from '../../src/store/auth-secret-accessor';
import { authenticateRequests$ } from '../../src/store/authenticate';
import { createVerifyAndPropagateAuthSecret } from '../../src/store/side-effects/auth-verification-handler';
import { authenticateSideEffect } from '../../src/store/side-effects/authentication';
import { makeAuthenticationPromptVerifying } from '../../src/store/side-effects/password-side-effects';
import { makeAuthenticationPromptCompleting } from '../../src/store/side-effects/side-effects';

import type { LocalAuthenticationDependency } from '../../src';
import type {
  Config,
  AuthenticationPromptSliceStateCompleting,
  AuthenticationPromptSliceStateVerifying,
} from '../../src';
import type { SecureStore } from '@lace-contract/secure-store';

vi.mock('@lace-contract/i18n', async () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await vi.importActual<typeof import('@lace-contract/i18n')>(
    '@lace-contract/i18n',
  );
  return {
    ...actual,
    getI18n: () => ({ t: (key: string) => key }),
  };
});

// Mock @lace-lib/navigation to avoid react-navigation loading issues
vi.mock('@lace-lib/navigation', () => ({
  navigationReferences: {},
  navigateAndReset: vi.fn(),
  navigate: vi.fn(),
}));

// Mock device auth checker for testing
vi.mock('../../src/authenticators/biometric/device-auth-checker', () => ({
  createDeviceAuthChecker: vi.fn(() => ({
    isAvailable: vi.fn(() => of(false)),
  })),
}));

const config: Config = {
  purpose: 'wallet-unlock',
  confirmButtonLabel: 'authentication-prompt.confirm-button-label',
  message: 'authentication-prompt.message.wallet-lock',
};

describe('authenticateSideEffect', () => {
  it('proceeds normally when the prompt is available', () => {
    const isAvailable$ = new BehaviorSubject(true);
    const completed$ = new Subject<
      ReturnType<typeof actions.authenticationPrompt.completed>
    >();
    const result$ = new Subject<boolean>();
    const emittedActions: unknown[] = [];

    const sub = authenticateSideEffect(
      { authenticationPrompt: { completed$ } } as never,
      { authenticationPrompt: { isAvailable$ } } as never,
      { actions } as never,
    ).subscribe(a => emittedActions.push(a));

    authenticateRequests$.next({ config, result$ });

    expect(emittedActions).toEqual([
      actions.authenticationPrompt.requested(config),
    ]);

    sub.unsubscribe();
  });

  it('rejects action-authorization immediately when prompt is busy', () => {
    const isAvailable$ = new BehaviorSubject(false);
    const result$ = new Subject<boolean>();
    const resultValues: boolean[] = [];
    result$.subscribe(v => resultValues.push(v));

    const emittedActions: unknown[] = [];

    const sub = authenticateSideEffect(
      { authenticationPrompt: { completed$: NEVER } } as never,
      { authenticationPrompt: { isAvailable$ } } as never,
      { actions } as never,
    ).subscribe(a => emittedActions.push(a));

    authenticateRequests$.next({
      config: { ...config, purpose: 'action-authorization' },
      result$,
    });

    expect(emittedActions).toHaveLength(0);
    expect(resultValues).toEqual([false]);

    sub.unsubscribe();
  });

  it('dispatches preempted, waits for completed$, then requested when wallet-unlock arrives while prompt is busy', () => {
    const isAvailable$ = new BehaviorSubject(false);
    const completed$ = new Subject<
      ReturnType<typeof actions.authenticationPrompt.completed>
    >();
    const result$ = new Subject<boolean>();
    const emittedActions: unknown[] = [];

    const sub = authenticateSideEffect(
      { authenticationPrompt: { completed$ } } as never,
      { authenticationPrompt: { isAvailable$ } } as never,
      { actions } as never,
    ).subscribe(a => emittedActions.push(a));

    const walletUnlockConfig = {
      ...config,
      purpose: 'wallet-unlock' as const,
    };
    authenticateRequests$.next({ config: walletUnlockConfig, result$ });

    expect(emittedActions).toEqual([actions.authenticationPrompt.preempted()]);

    // Preemption-caused completion consumed by concat
    completed$.next(actions.authenticationPrompt.completed({ success: false }));

    expect(emittedActions).toEqual([
      actions.authenticationPrompt.preempted(),
      actions.authenticationPrompt.requested(walletUnlockConfig),
    ]);

    sub.unsubscribe();
  });

  it('rejects requests with purpose "action-authorization" when prompt is busy', () => {
    const isAvailable$ = new BehaviorSubject(false);
    const result$ = new Subject<boolean>();
    const resultValues: boolean[] = [];
    result$.subscribe(v => resultValues.push(v));

    const emittedActions: unknown[] = [];

    const sub = authenticateSideEffect(
      { authenticationPrompt: { completed$: NEVER } } as never,
      { authenticationPrompt: { isAvailable$ } } as never,
      { actions } as never,
    ).subscribe(a => emittedActions.push(a));

    authenticateRequests$.next({
      config: {
        ...config,
        purpose: 'action-authorization',
      },
      result$,
    });

    expect(emittedActions).toHaveLength(0);
    expect(resultValues).toEqual([false]);

    sub.unsubscribe();
  });

  it('resolves wallet-unlock result$ after preemption and successful authentication', () => {
    const isAvailable$ = new BehaviorSubject(false);
    const completed$ = new Subject<
      ReturnType<typeof actions.authenticationPrompt.completed>
    >();

    const walletUnlockResult$ = new Subject<boolean>();
    const walletUnlockResultValues: boolean[] = [];
    walletUnlockResult$.subscribe(v => walletUnlockResultValues.push(v));

    const sub = authenticateSideEffect(
      { authenticationPrompt: { completed$ } } as never,
      { authenticationPrompt: { isAvailable$ } } as never,
      { actions } as never,
    ).subscribe();

    const walletUnlockConfig = {
      ...config,
      purpose: 'wallet-unlock' as const,
    };
    authenticateRequests$.next({
      config: walletUnlockConfig,
      result$: walletUnlockResult$,
    });

    // Preemption-caused completion consumed by concat (not by makeExecuteRequest$)
    completed$.next(actions.authenticationPrompt.completed({ success: false }));
    expect(walletUnlockResultValues).toEqual([]);

    // Wallet-unlock's own completion reaches makeExecuteRequest$
    completed$.next(actions.authenticationPrompt.completed({ success: true }));
    expect(walletUnlockResultValues).toEqual([true]);

    sub.unsubscribe();
  });

  it('proceeds normally with wallet-unlock when the prompt is available', () => {
    const isAvailable$ = new BehaviorSubject(true);
    const result$ = new Subject<boolean>();
    const emittedActions: unknown[] = [];

    const sub = authenticateSideEffect(
      { authenticationPrompt: { completed$: NEVER } } as never,
      { authenticationPrompt: { isAvailable$ } } as never,
      { actions } as never,
    ).subscribe(a => emittedActions.push(a));

    const walletUnlockConfig = {
      ...config,
      purpose: 'wallet-unlock' as const,
    };
    authenticateRequests$.next({ config: walletUnlockConfig, result$ });

    expect(emittedActions).toEqual([
      actions.authenticationPrompt.requested(walletUnlockConfig),
    ]);

    sub.unsubscribe();
  });
});

describe('makeAuthenticationPromptVerifying', () => {
  it('noop when not in verifying state', () => {
    const { accessSecretFromAuthFlow } = getTestAuthSecretDeps();

    const verifyAndPropagateAuthSecret = createVerifyAndPropagateAuthSecret({
      accessSecretFromAuthFlow,
      verifyAuthSecret: () => of(true),
    });

    testSideEffect(
      makeAuthenticationPromptVerifying({
        verifyAndPropagateAuthSecret,
      }),
      ({ cold, expectObservable }) => {
        return {
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('a', {
                a: {
                  config,
                  status: 'Completing',
                  success: true,
                } satisfies AuthenticationPromptSliceStateCompleting,
              }),
            },
          },
        };
      },
    );
  });

  it('performs verification using provided "verifyAuthSecret"', () => {
    const { accessSecretFromAuthFlow } = getTestAuthSecretDeps();
    const verifyAuthSecret = vi.fn().mockReturnValue(of(true));

    const verifyAndPropagateAuthSecret = createVerifyAndPropagateAuthSecret({
      accessSecretFromAuthFlow,
      verifyAuthSecret,
    });

    testSideEffect(
      makeAuthenticationPromptVerifying({
        verifyAndPropagateAuthSecret,
      }),
      ({ cold, flush, expectObservable }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: expect.any(Object) as unknown,
          });
          flush();

          expect(verifyAuthSecret).toHaveBeenCalledWith({
            authSecret: expect.any(Uint8Array) as Uint8Array,
          });
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold('a', {
              a: {
                config,
                status: 'VerifyingPassword',
              } satisfies AuthenticationPromptSliceStateVerifying,
            }),
          },
        },
      }),
    );
  });

  it('sends the "verified" event with result from "verifyAuthSecret"', () => {
    const isVerifiedSuccessfully = false;
    const { accessSecretFromAuthFlow } = getTestAuthSecretDeps();

    const verifyAndPropagateAuthSecret = createVerifyAndPropagateAuthSecret({
      accessSecretFromAuthFlow,
      verifyAuthSecret: () => of(isVerifiedSuccessfully),
    });

    testSideEffect(
      makeAuthenticationPromptVerifying({
        verifyAndPropagateAuthSecret,
      }),
      ({ cold, expectObservable }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.authenticationPrompt.verifiedPassword({
              success: isVerifiedSuccessfully,
            }),
          });
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold('a', {
              a: {
                config,
                status: 'VerifyingPassword',
              } satisfies AuthenticationPromptSliceStateVerifying,
            }),
          },
        },
      }),
    );
  });

  it('propagates the secret externally', () => {
    const { accessSecretFromAuthFlow } = getTestAuthSecretDeps();

    const verifyAndPropagateAuthSecret = createVerifyAndPropagateAuthSecret({
      accessSecretFromAuthFlow,
      verifyAuthSecret: () => of(true),
    });

    testSideEffect(
      makeAuthenticationPromptVerifying({
        verifyAndPropagateAuthSecret,
      }),
      ({ cold, flush, expectObservable }) => {
        const propagateSpy = vi.spyOn(
          authSecretAccessor,
          'propagateAuthSecret',
        );

        return {
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: expect.any(Object) as unknown,
            });
            flush();
            expect(propagateSpy).toHaveBeenCalledWith(
              expect.any(Uint8Array) as Uint8Array,
            );
          },
          stateObservables: {
            authenticationPrompt: {
              selectState$: cold('ab', {
                a: {
                  config,
                  status: 'VerifyingPassword',
                } satisfies AuthenticationPromptSliceStateVerifying,
                b: {
                  config,
                  status: 'Completing',
                  success: true,
                } satisfies AuthenticationPromptSliceStateCompleting,
              }),
            },
          },
        };
      },
    );
  });
});

describe('makeAuthenticationPromptCompleting', () => {
  const createMockSecureStore = (options?: {
    canUseBiometricAuth?: boolean;
  }): SecureStore => ({
    getItem: vi.fn(),
    setItem: vi.fn(),
    deleteItemAsync: vi.fn(),
    canUseBiometricAuthentication: vi
      .fn()
      .mockReturnValue(options?.canUseBiometricAuth ?? true),
    isAvailableAsync: vi.fn().mockResolvedValue(true),
  });

  const createMockLocalAuth = (
    enrolled: 'biometric' | 'none' | 'secret' = 'biometric',
  ): LocalAuthenticationDependency => ({
    getEnrolledLevel: vi.fn(() => of(enrolled)),
    authenticate: vi.fn(() => of({ success: true as const })),
    isEnrolled: vi.fn(() => of(enrolled !== 'none')),
  });

  const completingSuccessState: AuthenticationPromptSliceStateCompleting = {
    config,
    status: 'Completing',
    success: true,
  };
  const completingFailureState: AuthenticationPromptSliceStateCompleting = {
    config,
    status: 'Completing',
    success: false,
  };

  it('dispatches only "completed" when not awaiting biometric setup', () => {
    const { accessAuthSecret } = getTestAuthSecretDeps();
    testSideEffect(
      makeAuthenticationPromptCompleting('ios'),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: createMockSecureStore(),
          localAuthentication: createMockLocalAuth('biometric'),
          accessAuthSecret,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.authenticationPrompt.completed({ success: true }),
          });
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold('a', { a: completingSuccessState }),
            selectAwaitingBiometricSetup$: of(false),
          },
        },
      }),
    );
  });

  it('dispatches only "completed" when awaiting biometric setup but completion failed', () => {
    const { accessAuthSecret } = getTestAuthSecretDeps();
    testSideEffect(
      makeAuthenticationPromptCompleting('ios'),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: createMockSecureStore(),
          localAuthentication: createMockLocalAuth('biometric'),
          accessAuthSecret,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.authenticationPrompt.completed({ success: false }),
          });
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold('a', { a: completingFailureState }),
            selectAwaitingBiometricSetup$: of(true),
          },
        },
      }),
    );
  });

  it('dispatches only "completed" when awaiting biometric setup but local auth is unavailable', () => {
    const { accessAuthSecret } = getTestAuthSecretDeps();
    testSideEffect(
      makeAuthenticationPromptCompleting('ios'),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: createMockSecureStore(),
          localAuthentication: createMockLocalAuth('none'),
          accessAuthSecret,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.authenticationPrompt.completed({ success: true }),
          });
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold('a', { a: completingSuccessState }),
            selectAwaitingBiometricSetup$: of(true),
          },
        },
      }),
    );
  });

  it('dispatches setDeviceAuthReady(true) followed by completed when setPassword succeeds', () => {
    const { accessAuthSecret } = getTestAuthSecretDeps();
    const secureStore = createMockSecureStore();

    testSideEffect(
      makeAuthenticationPromptCompleting('ios'),
      ({ cold, expectObservable, flush }) => ({
        dependencies: {
          actions,
          secureStore,
          localAuthentication: createMockLocalAuth('biometric'),
          accessAuthSecret,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.authenticationPrompt.setDeviceAuthReady({
              deviceAuthReady: true,
            }),
            b: actions.authenticationPrompt.completed({ success: true }),
          });
          flush();
          expect(secureStore.setItem).toHaveBeenCalledWith(
            'passwordHex',
            expect.any(String) as string,
            expect.objectContaining({ requireAuthentication: true }) as object,
          );
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold('a', { a: completingSuccessState }),
            selectAwaitingBiometricSetup$: of(true),
          },
        },
      }),
    );
  });

  it('dispatches setDeviceAuthReady(false) followed by completed when setPassword throws', () => {
    const { accessAuthSecret } = getTestAuthSecretDeps();
    const secureStore = createMockSecureStore();
    vi.mocked(secureStore.setItem).mockImplementation(() => {
      throw new Error('Keystore failure');
    });

    testSideEffect(
      makeAuthenticationPromptCompleting('ios'),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore,
          localAuthentication: createMockLocalAuth('biometric'),
          accessAuthSecret,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.authenticationPrompt.setDeviceAuthReady({
              deviceAuthReady: false,
            }),
            b: actions.authenticationPrompt.completed({ success: true }),
          });
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold('a', { a: completingSuccessState }),
            selectAwaitingBiometricSetup$: of(true),
          },
        },
      }),
    );
  });

  it('skips biometric setup on web even when awaiting setup and completion succeeded', () => {
    const { accessAuthSecret } = getTestAuthSecretDeps();
    const secureStore = createMockSecureStore();

    testSideEffect(
      makeAuthenticationPromptCompleting('web'),
      ({ cold, expectObservable, flush }) => ({
        dependencies: {
          actions,
          secureStore,
          localAuthentication: createMockLocalAuth('biometric'),
          accessAuthSecret,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.authenticationPrompt.completed({ success: true }),
          });
          flush();
          expect(secureStore.setItem).not.toHaveBeenCalled();
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold('a', { a: completingSuccessState }),
            selectAwaitingBiometricSetup$: of(true),
          },
        },
      }),
    );
  });
});
