const mockWalletStore = {
  setBalancesVisibility: jest.fn(),
  walletUI: { areBalancesVisible: true, canManageBalancesVisibility: true }
} as unknown as Stores.WalletStore;
const mockUseWalletStore = jest.fn(() => mockWalletStore);
/* eslint-disable import/imports-first */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render } from '@testing-library/react';
import { BalanceVisibilityToggle } from '../BalanceVisibilityToggle';
import * as Stores from '@src/stores';

jest.mock('@src/stores', (): typeof Stores => ({
  ...jest.requireActual<typeof Stores>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

describe('BalanceVisibilityToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays closed eye icon if balances are visible', () => {
    const { queryByTestId } = render(<BalanceVisibilityToggle />);

    expect(queryByTestId('closed-eye-icon')).toBeInTheDocument();
    expect(queryByTestId('opened-eye-icon')).not.toBeInTheDocument();
  });

  test('displays opened eye icon if balances are not visible', () => {
    mockUseWalletStore.mockReturnValueOnce({
      setBalancesVisibility: jest.fn(),
      walletUI: { areBalancesVisible: false, canManageBalancesVisibility: true }
    } as unknown as Stores.WalletStore);
    const { queryByTestId } = render(<BalanceVisibilityToggle />);

    expect(queryByTestId('closed-eye-icon')).not.toBeInTheDocument();
    expect(queryByTestId('opened-eye-icon')).toBeInTheDocument();
  });

  test('calls setBalancesVisibility with areBalancesVisible negated if the eye icon was clicked', () => {
    const { queryByTestId } = render(<BalanceVisibilityToggle />);
    fireEvent.click(queryByTestId('closed-eye-icon'));

    expect(mockWalletStore.setBalancesVisibility).toHaveBeenCalledWith(!mockWalletStore.walletUI.areBalancesVisible);
  });

  test('does not call setBalancesVisibility if the eye icon was clicked when canManageBalancesVisibility is false', () => {
    mockUseWalletStore.mockReturnValueOnce({
      setBalancesVisibility: mockWalletStore.setBalancesVisibility,
      walletUI: { areBalancesVisible: true, canManageBalancesVisibility: false }
    } as unknown as Stores.WalletStore);
    const { queryByTestId } = render(<BalanceVisibilityToggle />);
    fireEvent.click(queryByTestId('closed-eye-icon'));

    expect(mockWalletStore.setBalancesVisibility).not.toHaveBeenCalled();
  });
});
