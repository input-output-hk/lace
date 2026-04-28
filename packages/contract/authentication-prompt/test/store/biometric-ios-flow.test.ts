/**
 * Tests for iOS-specific biometric authentication flow.
 * iOS directly retrieves from Keychain (no pre-auth needed).
 */
import { of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';

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

vi.mock('@lace-lib/navigation', () => ({
  navigationReferences: {},
  navigateAndReset: vi.fn(),
  navigate: vi.fn(),
}));

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

describe('makeAuthenticationBiometricVerifying - iOS flow', () => {
  let mockLocalAuth: LocalAuthenticationDependency;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalAuth = createMockLocalAuth();
  });

  const runIOSTest = async (
    mockSecureStore: ReturnType<typeof createMockSecureStore>,
  ) => {
    const { sideEffect } = createBiometricSideEffect(mockSecureStore, 'ios');
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
          localAuthentication: mockLocalAuth,
        } as unknown as Parameters<typeof sideEffect>[2],
      ),
    );
  };

  it('directly retrieves password without pre-auth', async () => {
    const mockSecureStore = createMockSecureStore(
      () => '746573742d70617373776f7264',
    );
    const result = await runIOSTest(mockSecureStore);

    // Should NOT have called authenticate on iOS (no pre-auth)
    expect(mockLocalAuth.authenticate).not.toHaveBeenCalled();
    // Should have directly retrieved from secure store
    expect(mockSecureStore.getItem).toHaveBeenCalled();
    expect(result).toEqual(
      actions.authenticationPrompt.verifiedBiometric({ success: true }),
    );
  });

  it('user cancel allows retry', async () => {
    const mockSecureStore = createMockSecureStore(() => {
      throw new Error('User canceled authentication');
    });
    const result = await runIOSTest(mockSecureStore);

    expect(mockLocalAuth.authenticate).not.toHaveBeenCalled();
    expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
  });

  it('device auth removed falls back to password prompt', async () => {
    const mockSecureStore = createMockSecureStore(() => {
      throw new Error(
        'No user authentication method configured for this device',
      );
    });
    const result = await runIOSTest(mockSecureStore);

    expect(result).toEqual(actions.authenticationPrompt.biometricCanceled());
  });
});
