/**
 * Tests for mobileWithBiometricsAndPassword secure store behavior
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

describe('mobileWithBiometricsAndPassword secure store behavior', () => {
  beforeEach(() => {
    setupMobileMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should store password in secure store on success', async () => {
    const mockSecureStore = createMockSecureStore();

    const [sideEffect] = await loadSideEffects([
      createMockIntegration('Cardano' as BlockchainName),
    ]);
    const logger = createLogger();
    const { trigger, emittedActions, cleanup } = setupSideEffect(
      sideEffect,
      logger,
      mockSecureStore,
    );

    trigger({ walletName: 'Store Password', password: 'user-password' });

    await vi.waitFor(() => {
      expect(emittedActions.length).toBeGreaterThanOrEqual(1);
    });

    cleanup();

    expect(mockPasswordManager.setPassword).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'User password stored in secure storage with OS-level biometric protection',
    );
    const successAction = emittedActions.find(isCreateWalletSuccessAction);
    expect(successAction).toBeDefined();
  });

  it('should still create wallet when setPassword throws (non-fatal)', async () => {
    const mockSecureStore = createMockSecureStore();
    mockPasswordManager.setPassword.mockImplementation(() => {
      throw new Error('Keystore failure');
    });

    const [sideEffect] = await loadSideEffects([
      createMockIntegration('Cardano' as BlockchainName),
    ]);
    const logger = createLogger();
    const { trigger, emittedActions, cleanup } = setupSideEffect(
      sideEffect,
      logger,
      mockSecureStore,
    );

    trigger({ walletName: 'Fallback Wallet', password: 'user-password' });

    await vi.waitFor(() => {
      expect(emittedActions.length).toBeGreaterThanOrEqual(1);
    });

    cleanup();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not store password in secure store'),
      expect.anything(),
    );
    const successAction = emittedActions.find(isCreateWalletSuccessAction);
    expect(successAction).toBeDefined();
  });

  it('should fail when no password provided', async () => {
    const mockSecureStore = createMockSecureStore();

    const [sideEffect] = await loadSideEffects([
      createMockIntegration('Cardano' as BlockchainName),
    ]);
    const logger = createLogger();
    const { trigger, emittedActions, cleanup } = setupSideEffect(
      sideEffect,
      logger,
      mockSecureStore,
    );

    trigger({ walletName: 'No Password', password: '' });

    await vi.waitFor(() => {
      expect(emittedActions.length).toBeGreaterThanOrEqual(1);
    });

    cleanup();

    const successAction = emittedActions.find(isCreateWalletSuccessAction);
    expect(successAction).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Password strategy failed'),
      expect.any(String),
    );
  });
});
