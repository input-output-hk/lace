/**
 * Shared test utilities for biometric side effects tests.
 */
import { of } from 'rxjs';
import { vi } from 'vitest';

import {
  authenticationPromptActions as actions,
  getTestAuthSecretDeps,
} from '../../src';
import { createVerifyAndPropagateAuthSecret } from '../../src/store/side-effects/auth-verification-handler';
import { makeAuthenticationBiometricVerifying } from '../../src/store/side-effects/biometrics-side-effects';

import type {
  Config,
  AuthenticationPromptSliceStateVerifying,
  LocalAuthenticationDependency,
} from '../../src';
import type { TFunction } from '@lace-contract/i18n';
import type { LacePlatform } from '@lace-contract/module';
import type { SecureStore } from '@lace-contract/secure-store';

// Re-export actions for convenience
export { actions };

// Mock translation function
export const mockTranslation: TFunction = (key: string) => key;

// Default test config
export const config: Config = {
  purpose: 'wallet-unlock',
  confirmButtonLabel: 'authentication-prompt.confirm-button-label',
  message: 'authentication-prompt.message.wallet-lock',
};

/**
 * Creates a mock LocalAuthenticationDependency
 */
export const createMockLocalAuth = (): LocalAuthenticationDependency => ({
  getEnrolledLevel: vi.fn(() => of('biometric' as const)),
  authenticate: vi.fn(() => of({ success: true as const })),
  isEnrolled: vi.fn(() => of(true)),
});

/**
 * Creates a mock SecureStore with customizable getItem behavior
 */
export const createMockSecureStore = (
  getItemBehavior?: () => string | null,
): SecureStore => ({
  getItem: getItemBehavior ? vi.fn(getItemBehavior) : vi.fn(),
  setItem: vi.fn(),
  deleteItemAsync: vi.fn(),
  canUseBiometricAuthentication: vi.fn().mockReturnValue(true),
  isAvailableAsync: vi.fn().mockResolvedValue(true),
});

/**
 * Creates a side effect configured for error testing
 */
export const createErrorTestSideEffect = (
  errorMessage: string,
  platform: LacePlatform = 'ios',
) => {
  const mockSecureStore = createMockSecureStore(() => {
    throw new Error(errorMessage);
  });

  const { accessSecretFromAuthFlow } = getTestAuthSecretDeps();

  const verifyAndPropagateAuthSecret = createVerifyAndPropagateAuthSecret({
    accessSecretFromAuthFlow,
    verifyAuthSecret: () => of(true),
  });

  return {
    mockSecureStore,
    sideEffect: makeAuthenticationBiometricVerifying({
      verifyAndPropagateAuthSecret,
      platform,
      sendAuthSecretInternally: vi.fn().mockReturnValue(of(undefined)),
    }),
  };
};

/**
 * Creates a configured side effect for success/failure testing
 */
export const createBiometricSideEffect = (
  _mockSecureStore: SecureStore,
  platform: LacePlatform = 'ios',
) => {
  const { accessSecretFromAuthFlow } = getTestAuthSecretDeps();

  const verifyAuthSecret = vi.fn().mockReturnValue(of(true));

  const verifyAndPropagateAuthSecret = createVerifyAndPropagateAuthSecret({
    accessSecretFromAuthFlow,
    verifyAuthSecret,
  });

  const mockSendAuthSecretInternally = vi.fn().mockReturnValue(of(undefined));

  return {
    sideEffect: makeAuthenticationBiometricVerifying({
      verifyAndPropagateAuthSecret,
      platform,
      sendAuthSecretInternally: mockSendAuthSecretInternally,
    }),
    verifyAuthSecret,
    mockSendAuthSecretInternally,
  };
};

/**
 * Runs a side effect test with common setup
 */
export const runSideEffectTest = async (
  sideEffect: ReturnType<typeof makeAuthenticationBiometricVerifying>,
  mockSecureStore: SecureStore,
  mockLocalAuth?: LocalAuthenticationDependency,
) => {
  const { firstValueFrom } = await import('rxjs');
  const selectState$ = of({
    config,
    status: 'VerifyingBiometric',
  } satisfies AuthenticationPromptSliceStateVerifying);
  return firstValueFrom(
    sideEffect(
      {} as unknown as Parameters<typeof sideEffect>[0],
      {
        authenticationPrompt: { selectState$ },
      } as unknown as Parameters<typeof sideEffect>[1],
      {
        actions,
        secureStore: mockSecureStore,
        t: mockTranslation,
        localAuthentication: mockLocalAuth ?? createMockLocalAuth(),
      } as unknown as Parameters<typeof sideEffect>[2],
    ),
  );
};
