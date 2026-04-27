import { WalletId } from '@lace-contract/wallet-repo';
import { HardwareIntegrationId } from '@lace-lib/util-hw';
import { describe, expect, it } from 'vitest';

import { onboardingV2Actions as actions } from '../../src';
import { onboardingV2Reducers } from '../../src/store/slice';

import type { OnboardingV2SliceState } from '../../src';
import type { BlockchainName } from '@lace-lib/util-store';

const getInitialState = (): OnboardingV2SliceState =>
  onboardingV2Reducers.onboardingV2(undefined, {
    type: '@@INIT',
  } as unknown as Parameters<typeof onboardingV2Reducers.onboardingV2>[1]);

describe('onboardingV2 slice', () => {
  describe('setPendingCreateWallet', () => {
    it('merges updates and removes undefined properties', () => {
      const initialState = getInitialState();
      const stateWithStatus: OnboardingV2SliceState = {
        ...initialState,
        createWalletError: 'biometric-auth-failed',
        lastCreatedWalletId: WalletId('wallet-existing'),
      };

      const stateWithPending = onboardingV2Reducers.onboardingV2(
        stateWithStatus,
        actions.onboardingV2.setPendingCreateWallet({
          password: 'abc',
          recoveryPhrase: ['one', 'two', 'three'],
        }),
      );

      expect(stateWithPending.pendingCreateWallet).toEqual({
        password: 'abc',
        recoveryPhrase: ['one', 'two', 'three'],
      });
      expect(stateWithPending.createWalletError).toBeNull();
      expect(stateWithPending.lastCreatedWalletId).toBeNull();

      const stateAfterRemoval = onboardingV2Reducers.onboardingV2(
        stateWithPending,
        actions.onboardingV2.setPendingCreateWallet({
          password: undefined,
        }),
      );

      expect(stateAfterRemoval.pendingCreateWallet).toEqual({
        recoveryPhrase: ['one', 'two', 'three'],
      });
    });

    it('clears pending data via clearPendingCreateWallet', () => {
      const stateWithPending = onboardingV2Reducers.onboardingV2(
        getInitialState(),
        actions.onboardingV2.setPendingCreateWallet({ password: 'abc' }),
      );

      const clearedState = onboardingV2Reducers.onboardingV2(
        stateWithPending,
        actions.onboardingV2.clearPendingCreateWallet(),
      );

      expect(clearedState.pendingCreateWallet).toBeNull();
    });
  });

  it('sets loading state when attempting to create a wallet', () => {
    const baseState = getInitialState();
    const state = onboardingV2Reducers.onboardingV2(
      baseState,
      actions.onboardingV2.attemptCreateWallet({
        walletName: 'My wallet',
        blockchains: ['Cardano' as BlockchainName],
        password: 'secret',
        recoveryPhrase: ['abandon'],
      }),
    );

    expect(state.isCreatingWallet).toBe(true);
    expect(state.createWalletError).toBeNull();
    expect(state.lastCreatedWalletId).toBeNull();
  });

  it('sets loading state when attempting to create a hardware wallet', () => {
    const stateWithError: OnboardingV2SliceState = {
      ...getInitialState(),
      createWalletError: 'creation-failed',
      lastCreatedWalletId: WalletId('old-wallet'),
    };

    const state = onboardingV2Reducers.onboardingV2(
      stateWithError,
      actions.onboardingV2.attemptCreateHardwareWallet({
        optionId: HardwareIntegrationId('ledger'),
        device: { vendorId: 0x2c97, productId: 0x4015, serialNumber: '0001' },
        accountIndex: 0,
        blockchainName: 'Cardano' as BlockchainName,
      }),
    );

    expect(state.isCreatingWallet).toBe(true);
    expect(state.createWalletError).toBeNull();
    expect(state.lastCreatedWalletId).toBeNull();
  });

  it('stores wallet information on successful creation', () => {
    const pendingState = onboardingV2Reducers.onboardingV2(
      getInitialState(),
      actions.onboardingV2.setPendingCreateWallet({ password: 'abc' }),
    );
    const busyState = onboardingV2Reducers.onboardingV2(
      pendingState,
      actions.onboardingV2.attemptCreateWallet({
        walletName: 'Name',
        blockchains: ['Cardano' as BlockchainName],
        password: 'secret',
      }),
    );

    const walletId = WalletId('wallet-generated');
    const state = onboardingV2Reducers.onboardingV2(
      busyState,
      actions.onboardingV2.createWalletSuccess({ walletId, isRecovery: false }),
    );

    expect(state.isCreatingWallet).toBe(false);
    expect(state.createWalletError).toBeNull();
    expect(state.lastCreatedWalletId).toBe(walletId);
    expect(state.pendingCreateWallet).toBeNull();
  });

  it('captures error information on failure', () => {
    const busyState = onboardingV2Reducers.onboardingV2(
      getInitialState(),
      actions.onboardingV2.attemptCreateWallet({
        walletName: 'Wallet',
        blockchains: ['Cardano' as BlockchainName],
        password: 'secret',
      }),
    );

    const state = onboardingV2Reducers.onboardingV2(
      busyState,
      actions.onboardingV2.createWalletFailure({ reason: 'creation-failed' }),
    );

    expect(state.isCreatingWallet).toBe(false);
    expect(state.createWalletError).toBe('creation-failed');
    expect(state.lastCreatedWalletId).toBeNull();
  });

  it('resets status via resetCreateWalletStatus', () => {
    const stateWithStatus: OnboardingV2SliceState = {
      ...getInitialState(),
      isCreatingWallet: true,
      createWalletError: 'creation-failed',
      lastCreatedWalletId: WalletId('wallet-123'),
    };

    const state = onboardingV2Reducers.onboardingV2(
      stateWithStatus,
      actions.onboardingV2.resetCreateWalletStatus(),
    );

    expect(state.isCreatingWallet).toBe(false);
    expect(state.createWalletError).toBeNull();
    expect(state.lastCreatedWalletId).toBeNull();
  });
});
