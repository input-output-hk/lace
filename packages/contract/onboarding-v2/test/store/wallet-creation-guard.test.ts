/**
 * Tests for wallet creation guard behavior
 */
import { vi, describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  mockPasswordManager,
  testRecoveryPhrase,
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

describe('wallet creation guard', () => {
  beforeEach(() => {
    setupMobileMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('should allow sequential wallet creations (guard resets after completion)', async () => {
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

    // First creation
    trigger({ walletName: 'First Wallet', password: 'user-password' });

    await vi.waitFor(() => {
      const successActions = emittedActions.filter(isCreateWalletSuccessAction);
      expect(successActions.length).toBe(1);
    });

    // Second creation should work after first completes
    trigger({
      walletName: 'Second Wallet',
      password: 'user-password',
      recoveryPhrase: [
        ...testRecoveryPhrase.slice(0, 11),
        'advice', // Different last word for different wallet ID
      ],
    });

    await vi.waitFor(() => {
      const successActions = emittedActions.filter(isCreateWalletSuccessAction);
      expect(successActions.length).toBe(2);
    });

    cleanup();

    // Should NOT have warned about duplicate
    const duplicateWarnings = vi
      .mocked(logger.warn)
      .mock.calls.filter(call =>
        String(call[0]).includes('already in progress'),
      );
    expect(duplicateWarnings.length).toBe(0);
  });
});
