/**
 * @vitest-environment jsdom
 */
import { onlineStatusActions } from '@lace-contract/online-status';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useReportOnlineStatus } from '../src/useReportOnlineStatus';

const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

const setNavigatorOnLine = (value: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
};

describe('useReportOnlineStatus (extension)', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    setNavigatorOnLine(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatches the current online state on mount', () => {
    setNavigatorOnLine(false);
    renderHook(() => useReportOnlineStatus());
    expect(mockDispatch).toHaveBeenCalledWith(
      onlineStatusActions.onlineStatus.setOffline(true),
    );
  });

  it('dispatches setOffline(false) when navigator reports online on mount', () => {
    setNavigatorOnLine(true);
    renderHook(() => useReportOnlineStatus());
    expect(mockDispatch).toHaveBeenCalledWith(
      onlineStatusActions.onlineStatus.setOffline(false),
    );
  });

  it('dispatches setOffline(true) when an offline event fires', () => {
    renderHook(() => useReportOnlineStatus());
    mockDispatch.mockClear();
    setNavigatorOnLine(false);
    window.dispatchEvent(new Event('offline'));
    expect(mockDispatch).toHaveBeenCalledWith(
      onlineStatusActions.onlineStatus.setOffline(true),
    );
  });

  it('dispatches setOffline(false) when an online event fires', () => {
    setNavigatorOnLine(false);
    renderHook(() => useReportOnlineStatus());
    mockDispatch.mockClear();
    setNavigatorOnLine(true);
    window.dispatchEvent(new Event('online'));
    expect(mockDispatch).toHaveBeenCalledWith(
      onlineStatusActions.onlineStatus.setOffline(false),
    );
  });

  it('removes window listeners on unmount', () => {
    const { unmount } = renderHook(() => useReportOnlineStatus());
    mockDispatch.mockClear();
    unmount();
    setNavigatorOnLine(false);
    window.dispatchEvent(new Event('offline'));
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
