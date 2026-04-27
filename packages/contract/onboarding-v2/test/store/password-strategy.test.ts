/**
 * Tests for selectPasswordStrategy
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

describe('selectPasswordStrategy', () => {
  beforeEach(() => {
    setupMobileMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('should return "web" for web platform', async () => {
    const mockSecureStore = createMockSecureStore();
    mockSecureStore.canUseBiometricAuthentication = vi
      .fn()
      .mockReturnValue(false);

    const [sideEffect] = await loadSideEffects(
      [createMockIntegration('Cardano' as BlockchainName)],
      'web',
    );
    const logger = createLogger();
    const { trigger, emittedActions, cleanup } = setupSideEffect(
      sideEffect,
      logger,
      mockSecureStore,
    );

    trigger({ walletName: 'Web Wallet', password: 'user-password' });

    await vi.waitFor(() => {
      expect(emittedActions.length).toBeGreaterThanOrEqual(1);
    });

    cleanup();

    const successAction = emittedActions.find(isCreateWalletSuccessAction);
    expect(successAction).toBeDefined();
  });

  it('should return "web" for web-extension platform', async () => {
    const mockSecureStore = createMockSecureStore();
    mockSecureStore.canUseBiometricAuthentication = vi
      .fn()
      .mockReturnValue(false);

    const [sideEffect] = await loadSideEffects(
      [createMockIntegration('Cardano' as BlockchainName)],
      'web-extension',
    );
    const logger = createLogger();
    const { trigger, emittedActions, cleanup } = setupSideEffect(
      sideEffect,
      logger,
      mockSecureStore,
    );

    trigger({ walletName: 'Extension Wallet', password: 'user-password' });

    await vi.waitFor(() => {
      expect(emittedActions.length).toBeGreaterThanOrEqual(1);
    });

    cleanup();

    const successAction = emittedActions.find(isCreateWalletSuccessAction);
    expect(successAction).toBeDefined();
  });

  it('should use "mobileWithBiometricsAndPassword" when biometrics available and user provided password', async () => {
    const mockSecureStore = createMockSecureStore();

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

    trigger({
      walletName: 'Manual Wallet',
      password: 'user-provided-password',
    });

    await vi.waitFor(() => {
      expect(emittedActions.length).toBeGreaterThanOrEqual(1);
    });

    cleanup();

    const successAction = emittedActions.find(isCreateWalletSuccessAction);
    expect(successAction).toBeDefined();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(
        'User password stored in secure storage with OS-level biometric protection',
      ),
    );
  });

  it('should fail with "mobileWithBiometricsAndPassword" when biometrics available but no user password', async () => {
    const mockSecureStore = createMockSecureStore();

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

    trigger({ walletName: 'Biometric Wallet', password: '' });

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

  it('should return "mobileWithoutBiometrics" when canUseSecureStoreWithAuth is false', async () => {
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

    trigger({ walletName: 'Android No Bio', password: 'manual-password' });

    await vi.waitFor(() => {
      expect(emittedActions.length).toBeGreaterThanOrEqual(1);
    });

    cleanup();

    const successAction = emittedActions.find(isCreateWalletSuccessAction);
    expect(successAction).toBeDefined();
  });
});
