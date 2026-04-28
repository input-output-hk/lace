import { testSideEffect } from '@lace-lib/util-dev';
import { of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  authenticationPromptActions as actions,
  getTestAuthSecretDeps,
} from '../../src';
import { createVerifyAndPropagateAuthSecret } from '../../src/store/side-effects/auth-verification-handler';
import { makeAuthenticationBiometricVerifying } from '../../src/store/side-effects/biometrics-side-effects';
import { makeAuthenticationPreparingSideEffect } from '../../src/store/side-effects/side-effects';

import type {
  Config,
  AuthenticationPromptSliceStatePreparing,
  AuthenticationPromptSliceStateVerifying,
} from '../../src';
import type { LocalAuthenticationDependency } from '../../src';
import type { TFunction } from '@lace-contract/i18n';
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

const mockTranslation: TFunction = (key: string) => key;

const config: Config = {
  purpose: 'wallet-unlock',
  confirmButtonLabel: 'authentication-prompt.confirm-button-label',
  message: 'authentication-prompt.message.wallet-lock',
};

describe('authenticationPreparingSideEffect', () => {
  const mockSecureStoreForPreparing: SecureStore = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    deleteItemAsync: vi.fn(),
    canUseBiometricAuthentication: vi.fn().mockReturnValue(false),
    isAvailableAsync: vi.fn().mockResolvedValue(true),
  };

  const mockLocalAuth: LocalAuthenticationDependency = {
    getEnrolledLevel: vi.fn(() => of('none' as const)),
    authenticate: vi.fn(() => of({ success: true as const })),
    isEnrolled: vi.fn(() => of(false)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches openedPassword when platform is web', () => {
    testSideEffect(
      makeAuthenticationPreparingSideEffect('web'),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: mockSecureStoreForPreparing,
          localAuthentication: mockLocalAuth,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.authenticationPrompt.openedPassword(),
          });
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold('a', {
              a: {
                config,
                status: 'Preparing',
              } satisfies AuthenticationPromptSliceStatePreparing,
            }),
          },
          features: {
            selectLoadedFeatures$: of({ featureFlags: [], modules: [] }),
          },
        },
      }),
    );
  });

  it('noop when not in preparing state', () => {
    testSideEffect(
      makeAuthenticationPreparingSideEffect('web'),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: mockSecureStoreForPreparing,
          localAuthentication: mockLocalAuth,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('');
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold('a', {
              a: {
                config,
                status: 'OpenPassword' as const,
                authSecretError: false,
              },
            }),
          },
          features: {
            selectLoadedFeatures$: of({ featureFlags: [], modules: [] }),
          },
        },
      }),
    );
  });
});

describe('makeAuthenticationBiometricVerifying', () => {
  const biometricLocalAuth: LocalAuthenticationDependency = {
    getEnrolledLevel: vi.fn(() => of('biometric' as const)),
    authenticate: vi.fn(() => of({ success: true as const })),
    isEnrolled: vi.fn(() => of(true)),
  };

  const mockSendAuthSecretInternally = vi.fn().mockReturnValue(of(undefined));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('noop when not in verifying biometric state', () => {
    const mockSecureStore: SecureStore = {
      getItem: vi.fn().mockReturnValue('746573742d70617373776f7264'),
      setItem: vi.fn(),
      deleteItemAsync: vi.fn(),
      canUseBiometricAuthentication: vi.fn().mockReturnValue(true),
      isAvailableAsync: vi.fn().mockResolvedValue(true),
    };

    const { accessSecretFromAuthFlow } = getTestAuthSecretDeps();

    const verifyAndPropagateAuthSecret = createVerifyAndPropagateAuthSecret({
      accessSecretFromAuthFlow,
      verifyAuthSecret: () => of(true),
    });

    testSideEffect(
      makeAuthenticationBiometricVerifying({
        verifyAndPropagateAuthSecret,
        platform: 'web',
        sendAuthSecretInternally: mockSendAuthSecretInternally,
      }),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: mockSecureStore,
          t: mockTranslation,
          localAuthentication: biometricLocalAuth,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('');
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold('a', {
              a: {
                config,
                status: 'OpenBiometric' as const,
                authSecretError: false,
              },
            }),
          },
        },
      }),
    );
  });

  it('falls back to password prompt when password retrieval fails', () => {
    const mockSecureStore: SecureStore = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      deleteItemAsync: vi.fn(),
      canUseBiometricAuthentication: vi.fn().mockReturnValue(true),
      isAvailableAsync: vi.fn().mockResolvedValue(true),
    };

    const { accessSecretFromAuthFlow } = getTestAuthSecretDeps();

    const verifyAndPropagateAuthSecret = createVerifyAndPropagateAuthSecret({
      accessSecretFromAuthFlow,
      verifyAuthSecret: () => of(true),
    });

    testSideEffect(
      makeAuthenticationBiometricVerifying({
        verifyAndPropagateAuthSecret,
        platform: 'web',
        sendAuthSecretInternally: mockSendAuthSecretInternally,
      }),
      ({ cold, expectObservable }) => ({
        dependencies: {
          actions,
          secureStore: mockSecureStore,
          t: mockTranslation,
          localAuthentication: biometricLocalAuth,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.authenticationPrompt.biometricCanceled(),
          });
        },
        stateObservables: {
          authenticationPrompt: {
            selectState$: cold('a', {
              a: {
                config,
                status: 'VerifyingBiometric',
              } satisfies AuthenticationPromptSliceStateVerifying,
            }),
          },
        },
      }),
    );
  });

  it('verifies password and sends verifiedBiometric when password retrieval succeeds', async () => {
    const mockPasswordHex = '746573742d70617373776f7264';
    const mockSecureStore: SecureStore = {
      getItem: vi.fn().mockReturnValue(mockPasswordHex),
      setItem: vi.fn(),
      deleteItemAsync: vi.fn(),
      canUseBiometricAuthentication: vi.fn().mockReturnValue(true),
      isAvailableAsync: vi.fn().mockResolvedValue(true),
    };

    const { accessSecretFromAuthFlow } = getTestAuthSecretDeps();
    const verifyAuthSecret = vi.fn().mockReturnValue(of(true));

    const verifyAndPropagateAuthSecret = createVerifyAndPropagateAuthSecret({
      accessSecretFromAuthFlow,
      verifyAuthSecret,
    });

    const mockSendAuthSecretInternally = vi.fn().mockReturnValue(of(undefined));

    const sideEffect = makeAuthenticationBiometricVerifying({
      verifyAndPropagateAuthSecret,
      platform: 'web',
      sendAuthSecretInternally: mockSendAuthSecretInternally,
    });

    const { firstValueFrom } = await import('rxjs');
    const selectState$ = of({
      config,
      status: 'VerifyingBiometric',
    } satisfies AuthenticationPromptSliceStateVerifying);

    const actionObservables = {} as unknown as Parameters<typeof sideEffect>[0];
    const stateObservables = {
      authenticationPrompt: { selectState$ },
    } as unknown as Parameters<typeof sideEffect>[1];
    const dependencies = {
      actions,
      secureStore: mockSecureStore,
      t: mockTranslation,
      localAuthentication: biometricLocalAuth,
    } as unknown as Parameters<typeof sideEffect>[2];

    const result = await firstValueFrom(
      sideEffect(actionObservables, stateObservables, dependencies),
    );

    expect(result).toEqual(
      actions.authenticationPrompt.verifiedBiometric({ success: true }),
    );
    expect(mockSecureStore.getItem).toHaveBeenCalledWith('passwordHex', {
      requireAuthentication: true,
      authenticationPrompt: 'authentication-prompt.local-auth-message.unlock',
    });
  });
});
