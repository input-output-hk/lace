/**
 * Tests for iOS path (no pre-auth)
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

describe('iOS path (no pre-auth)', () => {
  beforeEach(() => {
    setupMobileMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('should store user password in secure store on iOS', async () => {
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

    trigger({ walletName: 'iOS Wallet', password: 'user-password' });

    await vi.waitFor(() => {
      expect(emittedActions.length).toBeGreaterThanOrEqual(1);
    });

    cleanup();

    // Should store password via setPassword (mobileWithBiometricsAndPassword strategy)
    expect(mockPasswordManager.setPassword).toHaveBeenCalled();
    const successAction = emittedActions.find(isCreateWalletSuccessAction);
    expect(successAction).toBeDefined();
  });
});
