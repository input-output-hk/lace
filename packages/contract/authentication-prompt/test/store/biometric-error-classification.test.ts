/**
 * Tests for error classification in biometric authentication flow.
 * These test the discriminateSecureStoreError function through side effect integration.
 */
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  actions,
  config,
  mockTranslation,
  createErrorTestSideEffect,
  createMockLocalAuth,
} from './biometric-test-utils';

import type { AuthenticationPromptSliceStateVerifying } from '../../src';

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

vi.mock('@lace-lib/navigation', () => ({
  navigationReferences: {},
  navigateAndReset: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('../../src/authenticators/biometric/device-auth-checker', () => ({
  createDeviceAuthChecker: vi.fn(() => ({
    isAvailable: vi.fn(() => of(false)),
  })),
}));

describe('discriminateSecureStoreError - error classification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const runErrorClassificationTest = async (errorMessage: string) => {
    const { sideEffect, mockSecureStore } =
      createErrorTestSideEffect(errorMessage);

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
          localAuthentication: createMockLocalAuth(),
        } as unknown as Parameters<typeof sideEffect>[2],
      ),
    );
  };

  describe('cancelled errors - allows retry', () => {
    it('classifies "user canceled authentication" as cancelled', async () => {
      const result = await runErrorClassificationTest(
        'User canceled authentication',
      );
      expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
    });

    it('classifies "user denied" as cancelled', async () => {
      const result = await runErrorClassificationTest(
        'User denied the request',
      );
      expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
    });
  });

  describe('lockout errors - falls back to password prompt', () => {
    it('classifies "too many attempts" as lockout', async () => {
      const result = await runErrorClassificationTest(
        'Too many attempts. Try again later.',
      );
      expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
    });

    it('classifies "biometric locked" as lockout', async () => {
      const result = await runErrorClassificationTest(
        'Biometric locked. Please wait.',
      );
      expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
    });
    it('classifies "key permanently invalidated" as lockout', async () => {
      const result = await runErrorClassificationTest(
        'Key permanently invalidated due to biometric change',
      );
      expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
    });
  });

  describe('auth_failed errors - allows retry', () => {
    it('classifies "authentication failed" as auth_failed', async () => {
      const result = await runErrorClassificationTest('Authentication failed');
      expect(result).toEqual(
        actions.authenticationPrompt.verifiedBiometric({ success: false }),
      );
    });
  });

  describe('not_available errors - falls back to password prompt', () => {
    it('classifies "no user authentication method configured" as not_available', async () => {
      const result = await runErrorClassificationTest(
        'No user authentication method configured for this device',
      );
      expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
    });

    it('classifies "no secure lock screen" as not_available', async () => {
      const result = await runErrorClassificationTest(
        'No secure lock screen has been set up',
      );
      expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
    });
  });

  describe('not_found errors - falls back to password prompt', () => {
    it('classifies "no password stored" as not_found', async () => {
      const result = await runErrorClassificationTest(
        'No password stored in secure store',
      );
      expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
    });
  });

  describe('unknown errors - allows retry', () => {
    it('classifies generic unknown error as unknown', async () => {
      const result = await runErrorClassificationTest(
        'Some unexpected error occurred',
      );
      expect(result).toEqual(
        actions.authenticationPrompt.verifiedBiometric({ success: false }),
      );
    });
  });
});
