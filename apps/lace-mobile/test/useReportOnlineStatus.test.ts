/**
 * @vitest-environment jsdom
 */
import type { AppStateStatus } from 'react-native';

import { onlineStatusActions } from '@lace-contract/online-status';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useReportOnlineStatus } from '../src/app/useReportOnlineStatus';

import type {
  NetInfoChangeHandler,
  NetInfoState,
} from '@react-native-community/netinfo';

const testState = {
  netInfoListener: null as NetInfoChangeHandler | null,
  appStateListener: null as ((status: AppStateStatus) => void) | null,
  fetchState: { isConnected: true } as NetInfoState,
};

const mockDispatch = vi.fn();
const refreshMock = vi.fn();
const appStateRemoveMock = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: vi.fn(async () => testState.fetchState),
    addEventListener: vi.fn((handler: NetInfoChangeHandler) => {
      testState.netInfoListener = handler;
      return () => {
        testState.netInfoListener = null;
      };
    }),
    refresh: vi.fn(async () => {
      refreshMock();
      return testState.fetchState;
    }),
  },
}));

vi.mock('react-native', () => ({
  AppState: {
    addEventListener: vi.fn(
      (_type: string, handler: (status: AppStateStatus) => void) => {
        testState.appStateListener = handler;
        return { remove: appStateRemoveMock };
      },
    ),
  },
}));

const setNetInfoState = (state: Partial<NetInfoState>): void => {
  testState.fetchState = { ...testState.fetchState, ...state } as NetInfoState;
};

const flushMicrotasks = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0));
};

describe('useReportOnlineStatus (mobile)', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    refreshMock.mockClear();
    appStateRemoveMock.mockClear();
    testState.netInfoListener = null;
    testState.appStateListener = null;
    testState.fetchState = { isConnected: true } as NetInfoState;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches setOffline(false) on mount when NetInfo reports connected', async () => {
    setNetInfoState({ isConnected: true });
    renderHook(() => {
      useReportOnlineStatus();
    });
    await flushMicrotasks();
    expect(mockDispatch).toHaveBeenCalledWith(
      onlineStatusActions.onlineStatus.setOffline(false),
    );
  });

  it('dispatches setOffline(true) on mount when NetInfo reports disconnected', async () => {
    setNetInfoState({ isConnected: false });
    renderHook(() => {
      useReportOnlineStatus();
    });
    await flushMicrotasks();
    expect(mockDispatch).toHaveBeenCalledWith(
      onlineStatusActions.onlineStatus.setOffline(true),
    );
  });

  it('dispatches setOffline(true) when NetInfo emits a disconnected state', async () => {
    renderHook(() => {
      useReportOnlineStatus();
    });
    await flushMicrotasks();
    mockDispatch.mockClear();
    testState.netInfoListener?.({ isConnected: false } as NetInfoState);
    expect(mockDispatch).toHaveBeenCalledWith(
      onlineStatusActions.onlineStatus.setOffline(true),
    );
  });

  it('dispatches setOffline(false) when NetInfo emits a connected state', async () => {
    setNetInfoState({ isConnected: false });
    renderHook(() => {
      useReportOnlineStatus();
    });
    await flushMicrotasks();
    mockDispatch.mockClear();
    testState.netInfoListener?.({ isConnected: true } as NetInfoState);
    expect(mockDispatch).toHaveBeenCalledWith(
      onlineStatusActions.onlineStatus.setOffline(false),
    );
  });

  it('ignores `isInternetReachable` and uses `isConnected` only', async () => {
    renderHook(() => {
      useReportOnlineStatus();
    });
    await flushMicrotasks();
    mockDispatch.mockClear();
    testState.netInfoListener?.({
      isConnected: true,
      isInternetReachable: false,
    } as NetInfoState);
    expect(mockDispatch).toHaveBeenLastCalledWith(
      onlineStatusActions.onlineStatus.setOffline(false),
    );
  });

  it('refreshes NetInfo and dispatches when AppState becomes active', async () => {
    renderHook(() => {
      useReportOnlineStatus();
    });
    await flushMicrotasks();
    mockDispatch.mockClear();
    refreshMock.mockClear();

    setNetInfoState({ isConnected: false });
    testState.appStateListener?.('active');
    await flushMicrotasks();

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      onlineStatusActions.onlineStatus.setOffline(true),
    );
  });

  it('does not refresh when AppState transitions to a non-active status', async () => {
    renderHook(() => {
      useReportOnlineStatus();
    });
    await flushMicrotasks();
    refreshMock.mockClear();

    testState.appStateListener?.('background');
    testState.appStateListener?.('inactive');
    await flushMicrotasks();

    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('unsubscribes from NetInfo and AppState on unmount', async () => {
    const { unmount } = renderHook(() => {
      useReportOnlineStatus();
    });
    await flushMicrotasks();
    unmount();
    expect(testState.netInfoListener).toBeNull();
    expect(appStateRemoveMock).toHaveBeenCalledTimes(1);
  });
});
