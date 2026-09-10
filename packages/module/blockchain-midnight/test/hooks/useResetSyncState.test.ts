/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useResetSyncState } from '../../src/hooks/useResetSyncState';

import type { AccountId } from '@lace-contract/wallet-repo';

const mockDispatchResetSyncState = vi.fn();
const mockUseDispatchLaceAction = vi.fn(
  (..._args: unknown[]) => mockDispatchResetSyncState,
);

vi.mock('../../src/hooks/lace-context', () => ({
  useDispatchLaceAction: (action: string, ...args: unknown[]): unknown =>
    mockUseDispatchLaceAction(action, ...args),
}));

const accountId = 'walletId-mn-0-Undeployed' as AccountId;

describe('useResetSyncState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens and closes the confirm dialog', () => {
    const { result } = renderHook(() => useResetSyncState(accountId));
    expect(result.current.isConfirmOpen).toBe(false);

    act(() => {
      result.current.open();
    });
    expect(result.current.isConfirmOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isConfirmOpen).toBe(false);
  });

  it('dispatches nothing until resetAndRestart, then resets the account', () => {
    const { result } = renderHook(() => useResetSyncState(accountId));

    act(() => {
      result.current.open();
    });
    expect(mockDispatchResetSyncState).not.toHaveBeenCalled();

    act(() => {
      result.current.resetAndRestart();
    });
    expect(mockUseDispatchLaceAction).toHaveBeenCalledWith(
      'midnightContext.resetSyncState',
    );
    expect(mockDispatchResetSyncState).toHaveBeenCalledWith({ accountId });
  });

  it('closes the confirm dialog on resetAndRestart', () => {
    const { result } = renderHook(() => useResetSyncState(accountId));

    act(() => {
      result.current.open();
    });
    expect(result.current.isConfirmOpen).toBe(true);

    act(() => {
      result.current.resetAndRestart();
    });
    expect(result.current.isConfirmOpen).toBe(false);
  });
});
