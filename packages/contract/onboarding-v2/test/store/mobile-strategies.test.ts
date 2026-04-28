/**
 * Tests for mobileWithoutBiometrics strategy
 */
import { vi, describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  mockPasswordManager,
  setupMobileMocks,
  loadSideEffects,
  createMockIntegration,
  createMockSecureStore,
  createLogger,
  setupSideEffect,
} from './test-helpers';

import type { BlockchainName } from '@lace-lib/util-store';

vi.mock('@lace-contract/authentication-prompt', async () => {
  const actual = await vi.importActual('@lace-contract/authentication-prompt');
  return {
    ...actual,
    createSecureStorePasswordManager: vi.fn(() => mockPasswordManager),
  };
});

describe('mobileWithoutBiometrics strategy', () => {
  beforeEach(() => {
    setupMobileMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('should fail when password is empty', async () => {
    const mockSecureStore = createMockSecureStore();
    mockSecureStore.canUseBiometricAuthentication = vi
      .fn()
      .mockReturnValue(false);

    const [sideEffect] = await loadSideEffects(
      [createMockIntegration('Cardano' as BlockchainName)],
      'ios',
    );
    const logger = createLogger();
    const { trigger, emittedActions, cleanup } = setupSideEffect(
      sideEffect,
      logger,
      mockSecureStore,
    );

    trigger({ walletName: 'No Password Wallet', password: '' });

    await vi.waitFor(() => {
      expect(emittedActions.length).toBeGreaterThanOrEqual(1);
    });

    cleanup();

    expect(logger.error).toHaveBeenCalledWith(
      'Password is required when biometrics are not available',
    );
  });

  it('should fail when password is only whitespace', async () => {
    const mockSecureStore = createMockSecureStore();
    mockSecureStore.canUseBiometricAuthentication = vi
      .fn()
      .mockReturnValue(false);

    const [sideEffect] = await loadSideEffects(
      [createMockIntegration('Cardano' as BlockchainName)],
      'android',
    );
    const logger = createLogger();
    const { trigger, emittedActions, cleanup } = setupSideEffect(
      sideEffect,
      logger,
      mockSecureStore,
    );

    trigger({ walletName: 'Whitespace Password', password: '   ' });

    await vi.waitFor(() => {
      expect(emittedActions.length).toBeGreaterThanOrEqual(1);
    });

    cleanup();

    expect(logger.error).toHaveBeenCalledWith(
      'Password is required when biometrics are not available',
    );
  });
});
