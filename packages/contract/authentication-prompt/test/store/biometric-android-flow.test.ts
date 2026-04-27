/**
 * Tests for Android-specific biometric authentication flow.
 *
 * NEW FLOW (Direct-first, pre-auth on bug):
 * 1. Try direct Keystore retrieval (1 prompt)
 * 2. If Android Keystore bug detected → use pre-auth for retry
 * 3. Happy path = 1 prompt
 */
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  resetBiometricRetryState,
  resetPreAuthState,
} from '../../src/store/side-effects/biometrics-side-effects';

import {
  actions,
  config,
  mockTranslation,
  createMockSecureStore,
  createBiometricSideEffect,
  createMockLocalAuth,
} from './biometric-test-utils';

import type { LocalAuthenticationDependency } from '../../src';
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

describe('makeAuthenticationBiometricVerifying - Android flow', () => {
  let mockLocalAuth: LocalAuthenticationDependency;

  beforeEach(() => {
    vi.clearAllMocks();
    resetBiometricRetryState();
    resetPreAuthState();
    mockLocalAuth = createMockLocalAuth();
  });

  const runAndroidTest = async (
    mockSecureStore: ReturnType<typeof createMockSecureStore>,
    localAuth?: LocalAuthenticationDependency,
  ) => {
    const { sideEffect } = createBiometricSideEffect(
      mockSecureStore,
      'android',
    );

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
          localAuthentication: localAuth ?? mockLocalAuth,
        } as unknown as Parameters<typeof sideEffect>[2],
      ),
    );
  };

  describe('direct Keystore retrieval (happy path)', () => {
    it('direct Keystore success returns verified (1 prompt)', async () => {
      // No pre-auth mock needed - direct Keystore succeeds
      const mockSecureStore = createMockSecureStore(
        () => '746573742d70617373776f7264',
      );
      const result = await runAndroidTest(mockSecureStore);

      // No pre-auth should be called on happy path
      expect(mockLocalAuth.authenticate).not.toHaveBeenCalled();
      expect(result).toEqual(
        actions.authenticationPrompt.verifiedBiometric({ success: true }),
      );
    });

    it('direct Keystore cancelled allows retry', async () => {
      const mockSecureStore = createMockSecureStore(() => {
        throw new Error('User canceled authentication');
      });
      const result = await runAndroidTest(mockSecureStore);

      // No pre-auth on cancel
      expect(mockLocalAuth.authenticate).not.toHaveBeenCalled();
      expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
    });

    it('direct Keystore auth failed allows retry', async () => {
      const mockSecureStore = createMockSecureStore(() => {
        throw new Error('Authentication failed');
      });
      const result = await runAndroidTest(mockSecureStore);

      expect(mockLocalAuth.authenticate).not.toHaveBeenCalled();
      expect(result).toEqual(
        actions.authenticationPrompt.verifiedBiometric({ success: false }),
      );
    });
  });

  describe('Android Keystore bug handling', () => {
    it('Keystore bug detected triggers pre-auth retry', async () => {
      // First call fails with the Keystore bug
      let callCount = 0;
      const mockSecureStore = createMockSecureStore(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Could not decrypt the value. Caused by: unknown');
        }
        // Second call (after pre-auth) succeeds
        return '746573742d70617373776f7264';
      });

      // Pre-auth succeeds
      mockLocalAuth.authenticate = vi.fn(() => of({ success: true as const }));

      const result = await runAndroidTest(mockSecureStore);

      // Pre-auth should be called after bug detected
      expect(mockLocalAuth.authenticate).toHaveBeenCalledWith({
        promptMessage: 'Please verify with biometrics to continue',
        disableDeviceFallback: true,
        cancelLabel: 'Cancel',
      });
      expect(result).toEqual(
        actions.authenticationPrompt.verifiedBiometric({ success: true }),
      );
    });

    it('Keystore bug + pre-auth lockout falls back to password prompt', async () => {
      const mockSecureStore = createMockSecureStore(() => {
        throw new Error('Could not decrypt the value. Caused by: unknown');
      });

      mockLocalAuth.authenticate = vi.fn(() =>
        of({ success: false as const, error: 'lockout' }),
      );

      const result = await runAndroidTest(mockSecureStore);

      expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
    });

    it('Keystore bug + pre-auth cancelled allows retry', async () => {
      const mockSecureStore = createMockSecureStore(() => {
        throw new Error('Could not decrypt the value. Caused by: unknown');
      });

      mockLocalAuth.authenticate = vi.fn(() =>
        of({ success: false as const, error: 'user_cancel' }),
      );

      const result = await runAndroidTest(mockSecureStore);

      expect(result).toEqual(
        actions.authenticationPrompt.verifiedBiometric({
          success: false,
          androidKeystoreRecovery: {
            attemptNumber: 1,
            maxAttempts: 3,
          },
        }),
      );
    });

    it('Keystore bug + pre-auth failed allows retry', async () => {
      const mockSecureStore = createMockSecureStore(() => {
        throw new Error('Could not decrypt the value. Caused by: unknown');
      });

      mockLocalAuth.authenticate = vi.fn(() =>
        of({ success: false as const, error: 'not_enrolled' }),
      );

      const result = await runAndroidTest(mockSecureStore);

      expect(result).toEqual(
        actions.authenticationPrompt.verifiedBiometric({
          success: false,
          androidKeystoreRecovery: {
            attemptNumber: 1,
            maxAttempts: 3,
          },
        }),
      );
    });
  });

  describe('max retry attempts (3 failures triggers recovery)', () => {
    it('3 consecutive pre-auth cancellations triggers recovery on 3rd attempt', async () => {
      const mockSecureStore = createMockSecureStore(() => {
        throw new Error('Could not decrypt the value. Caused by: unknown');
      });

      mockLocalAuth.authenticate = vi.fn(() =>
        of({ success: false as const, error: 'user_cancel' }),
      );

      // First attempt - should allow retry (attempt 1/3)
      const result1 = await runAndroidTest(mockSecureStore);
      expect(result1).toEqual(
        actions.authenticationPrompt.verifiedBiometric({
          success: false,
          androidKeystoreRecovery: {
            attemptNumber: 1,
            maxAttempts: 3,
          },
        }),
      );

      // Second attempt - should allow retry (attempt 2/3)
      const result2 = await runAndroidTest(mockSecureStore);
      expect(result2).toEqual(
        actions.authenticationPrompt.verifiedBiometric({
          success: false,
          androidKeystoreRecovery: {
            attemptNumber: 2,
            maxAttempts: 3,
          },
        }),
      );

      // Third attempt - should fall back to password prompt (reached max attempts)
      const result3 = await runAndroidTest(mockSecureStore);
      expect(result3).toEqual(actions.authenticationPrompt.biometricCanceled());
    });

    it('3 consecutive pre-auth failures falls back to password prompt on 3rd attempt', async () => {
      const mockSecureStore = createMockSecureStore(() => {
        throw new Error('Could not decrypt the value. Caused by: unknown');
      });

      mockLocalAuth.authenticate = vi.fn(() =>
        of({ success: false as const, error: 'not_enrolled' }),
      );

      // First attempt - should allow retry (attempt 1/3)
      const result1 = await runAndroidTest(mockSecureStore);
      expect(result1).toEqual(
        actions.authenticationPrompt.verifiedBiometric({
          success: false,
          androidKeystoreRecovery: {
            attemptNumber: 1,
            maxAttempts: 3,
          },
        }),
      );

      // Second attempt - should allow retry (attempt 2/3)
      const result2 = await runAndroidTest(mockSecureStore);
      expect(result2).toEqual(
        actions.authenticationPrompt.verifiedBiometric({
          success: false,
          androidKeystoreRecovery: {
            attemptNumber: 2,
            maxAttempts: 3,
          },
        }),
      );

      // Third attempt - should fall back to password prompt (reached max attempts)
      const result3 = await runAndroidTest(mockSecureStore);
      expect(result3).toEqual(actions.authenticationPrompt.biometricCanceled());
    });

    it('successful auth on 2nd attempt resets retry count', async () => {
      let callCount = 0;
      const mockSecureStore = createMockSecureStore(() => {
        callCount++;
        // Always fail first call (triggers Keystore bug detection)
        // Second call succeeds (after pre-auth)
        if (callCount % 2 === 1) {
          throw new Error('Could not decrypt the value. Caused by: unknown');
        }
        return '746573742d70617373776f7264';
      });

      // First attempt fails pre-auth, second attempt succeeds
      let authenticateCallCount = 0;
      mockLocalAuth.authenticate = vi.fn(() => {
        authenticateCallCount++;
        if (authenticateCallCount === 1) {
          return of({ success: false as const, error: 'user_cancel' });
        }
        return of({ success: true as const });
      });

      // First attempt - cancelled (attempt 1/3)
      const result1 = await runAndroidTest(mockSecureStore);
      expect(result1).toEqual(
        actions.authenticationPrompt.verifiedBiometric({
          success: false,
          androidKeystoreRecovery: {
            attemptNumber: 1,
            maxAttempts: 3,
          },
        }),
      );

      // Second attempt - succeeds! (should reset retry count)
      const result2 = await runAndroidTest(mockSecureStore);
      expect(result2).toEqual(
        actions.authenticationPrompt.verifiedBiometric({ success: true }),
      );
    });
  });

  describe('non-bug errors', () => {
    it('not_available error falls back to password prompt', async () => {
      const mockSecureStore = createMockSecureStore(() => {
        throw new Error('no user authentication method configured');
      });
      const result = await runAndroidTest(mockSecureStore);

      expect(mockLocalAuth.authenticate).not.toHaveBeenCalled();
      expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
    });

    it('not_found error falls back to password prompt', async () => {
      const mockSecureStore = createMockSecureStore(() => {
        throw new Error('No password stored');
      });
      const result = await runAndroidTest(mockSecureStore);

      expect(mockLocalAuth.authenticate).not.toHaveBeenCalled();
      expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
    });

    it('lockout error falls back to password prompt', async () => {
      const mockSecureStore = createMockSecureStore(() => {
        throw new Error('Too many attempts. Biometric locked out.');
      });
      const result = await runAndroidTest(mockSecureStore);

      expect(mockLocalAuth.authenticate).not.toHaveBeenCalled();
      expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
    });
  });
});
