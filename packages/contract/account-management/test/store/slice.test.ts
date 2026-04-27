import { WalletId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import {
  accountManagementActions,
  accountManagementReducers,
} from '../../src/store/slice';

import type { LastAddedAccount } from '../../src/store/slice';

describe('account-management slice', () => {
  it('stores lastAddedAccount when not suppressed', () => {
    const payload: LastAddedAccount = {
      walletId: WalletId('wallet-1'),
      blockchain: 'Cardano',
      accountIndex: 0,
    };

    const state = accountManagementReducers.accountManagement(
      undefined,
      accountManagementActions.accountManagement.accountAdded(payload),
    );

    expect(state.lastAddedAccount).toEqual(payload);
    expect(state.lastFailedWallet).toBeNull();
  });

  it('clears lastAddedAccount when suppressed', () => {
    const payload: LastAddedAccount = {
      walletId: WalletId('wallet-1'),
      blockchain: 'Cardano',
      accountIndex: 0,
      shouldSuppressAccountStatus: true,
    };

    const state = accountManagementReducers.accountManagement(
      undefined,
      accountManagementActions.accountManagement.accountAdded(payload),
    );

    expect(state.lastAddedAccount).toBeNull();
    expect(state.lastFailedWallet).toBeNull();
  });

  it('records HW wallet creation error and stops loading', () => {
    const state = accountManagementReducers.accountManagement(
      {
        isLoading: true,
        lastAddedAccount: null,
        lastFailedWallet: null,
        lastFailedErrorTitle: null,
        lastFailedErrorDescription: null,
        lastHardwareWalletCreationError: null,
        restoreWalletFlow: null,
      },
      accountManagementActions.accountManagement.hardwareWalletCreationFailed({
        reason: 'device-disconnected',
      }),
    );

    expect(state.lastHardwareWalletCreationError).toBe('device-disconnected');
    expect(state.isLoading).toBe(false);
  });

  it('clears HW wallet creation error via clearAccountStatus', () => {
    const state = accountManagementReducers.accountManagement(
      {
        isLoading: false,
        lastAddedAccount: null,
        lastFailedWallet: null,
        lastFailedErrorTitle: null,
        lastFailedErrorDescription: null,
        lastHardwareWalletCreationError: 'generic',
        restoreWalletFlow: null,
      },
      accountManagementActions.accountManagement.clearAccountStatus(),
    );

    expect(state.lastHardwareWalletCreationError).toBeNull();
  });
});
