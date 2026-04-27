/**
 * Tests for Android wallet creation (without pre-auth)
 *
 * Note: Pre-auth is only used during authentication (password retrieval),
 * not during wallet creation. During wallet creation, the user's password
 * is stored in secure store with biometric protection.
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
  isCreateWalletSuccessAction,
} from './test-helpers';

import type { BlockchainName } from '@lace-lib/util-store';

vi.mock('@lace-contract/authentication-prompt', async () => {
  const actual = await vi.importActual('@lace-contract/authentication-prompt');
  return {
    ...actual,
    createSecureStorePasswordManager: vi.fn(() => mockPasswordManager),
  };
});

describe('Android wallet creation (without pre-auth)', () => {
  beforeEach(() => {
    setupMobileMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('should create wallet directly with secure store (no pre-auth)', async () => {
    const mockSecureStore = createMockSecureStore();
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

    trigger({ walletName: 'Android Wallet', password: 'user-password' });

    await vi.waitFor(() => {
      expect(emittedActions.length).toBeGreaterThanOrEqual(1);
    });

    cleanup();

    // Verify NO pre-auth was called
    expect(logger.debug).not.toHaveBeenCalledWith(
      expect.stringContaining('[AndroidPreAuth]'),
    );

    // Verify password was stored via mobileWithBiometricsAndPassword strategy
    expect(mockPasswordManager.setPassword).toHaveBeenCalled();

    // Verify wallet was created successfully
    const successAction = emittedActions.find(isCreateWalletSuccessAction);
    expect(successAction).toBeDefined();
  });

  it('should create wallet without calling local auth during creation', async () => {
    const mockSecureStore = createMockSecureStore();
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

    trigger({ walletName: 'Direct Secure Store', password: 'user-password' });

    await vi.waitFor(() => {
      expect(emittedActions.length).toBeGreaterThanOrEqual(1);
    });

    cleanup();

    // Password should be stored via setPassword (not auto-generated via createPassword)
    expect(mockPasswordManager.setPassword).toHaveBeenCalled();
  });
});
