import { describe, it, expect, vi, beforeEach } from 'vitest';

import { navigationRef } from '../src/core';
import {
  findLastRouteIndexByName,
  handleInteractiveSheetDismiss,
  NavigationControls,
  sheetStackScreenListeners,
} from '../src/core/navigation-controls';
import { SheetRoutes, TabRoutes } from '../src/types/routes';

import type { AccountId } from '@lace-contract/wallet-repo';
import type { NavigationState } from '@react-navigation/native';

const { mockSetParams, mockPop, mockPopToTop } = vi.hoisted(() => {
  const setParams = vi.fn((params: Record<string, unknown>) => ({
    type: 'SET_PARAMS' as const,
    payload: params,
  }));
  const pop = vi.fn((count: number) => ({
    type: 'POP' as const,
    payload: count,
  }));
  const popToTop = vi.fn(() => ({
    type: 'POP_TO_TOP' as const,
  }));
  return { mockSetParams: setParams, mockPop: pop, mockPopToTop: popToTop };
});

vi.mock('@react-navigation/native', () => ({
  CommonActions: {
    setParams: mockSetParams,
  },
  StackActions: {
    pop: mockPop,
    popToTop: mockPopToTop,
  },
}));

vi.mock('../src/core', () => ({
  navigationRef: {
    isReady: vi.fn(),
    navigate: vi.fn(),
    getCurrentRoute: vi.fn(),
    getRootState: vi.fn(),
    dispatch: vi.fn(),
    goBack: vi.fn(),
    addListener: vi.fn(() => vi.fn()),
  },
}));

describe('findLastRouteIndexByName', () => {
  it('returns -1 when state is undefined', () => {
    expect(findLastRouteIndexByName(undefined, SheetRoutes.Send)).toBe(-1);
  });

  it('returns -1 when routes are empty', () => {
    expect(
      findLastRouteIndexByName({ routes: [], index: 0 } as never, 'Send'),
    ).toBe(-1);
  });

  it('returns last matching index', () => {
    const state = {
      index: 2,
      routes: [
        { key: 'a', name: SheetRoutes.RootStack },
        { key: 'b', name: SheetRoutes.Send, params: { x: 1 } },
        { key: 'c', name: SheetRoutes.AddAssets },
      ],
    } as unknown as NavigationState;

    expect(findLastRouteIndexByName(state, SheetRoutes.Send)).toBe(1);
  });
});

describe('NavigationControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(navigationRef.getRootState).mockReturnValue(undefined as never);
  });

  describe('navigate', () => {
    it('navigates when navigation is ready', () => {
      const mockNavigate = vi.mocked(navigationRef.navigate);
      const mockIsReady = vi.mocked(navigationRef.isReady);

      mockIsReady.mockReturnValue(true);

      NavigationControls.navigate(SheetRoutes.RootStack, {
        screen: SheetRoutes.RootStack as never,
      });

      expect(mockIsReady).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith({
        name: SheetRoutes.RootStack,
        params: {
          screen: SheetRoutes.RootStack,
        },
      });
    });

    it('navigates with params and options when navigation is ready', () => {
      const mockNavigate = vi.mocked(navigationRef.navigate);
      const mockIsReady = vi.mocked(navigationRef.isReady);

      mockIsReady.mockReturnValue(true);

      const params = { walletId: 'test-wallet', accountId: 'test-account' };
      const options = { merge: true, pop: false };

      NavigationControls.navigate(SheetRoutes.RemoveAccount, params, options);

      expect(mockIsReady).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith({
        name: SheetRoutes.RemoveAccount,
        params,
        ...options,
      });
    });

    it('does not navigate when navigation is not ready', () => {
      const mockNavigate = vi.mocked(navigationRef.navigate);
      const mockIsReady = vi.mocked(navigationRef.isReady);

      mockIsReady.mockReturnValue(false);

      NavigationControls.navigate(SheetRoutes.RootStack, {
        screen: TabRoutes.AccountCenter as never,
      });

      expect(mockIsReady).toHaveBeenCalledOnce();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('pops to an existing sheet route and merges params instead of pushing', async () => {
      const mockDispatch = vi.mocked(navigationRef.dispatch);
      const mockNavigate = vi.mocked(navigationRef.navigate);
      const mockIsReady = vi.mocked(navigationRef.isReady);
      const mockGetRootState = vi.mocked(navigationRef.getRootState);
      const mockGetCurrentRoute = vi.mocked(navigationRef.getCurrentRoute);

      mockIsReady.mockReturnValue(true);
      mockGetCurrentRoute.mockReturnValueOnce({
        key: 'add-assets',
        name: SheetRoutes.AddAssets,
      } as never);
      mockGetCurrentRoute.mockReturnValue({
        key: 'send',
        name: SheetRoutes.Send,
      } as never);
      mockGetRootState.mockReturnValue({
        index: 2,
        routes: [
          { key: 'root', name: SheetRoutes.RootStack },
          {
            key: 'send',
            name: SheetRoutes.Send,
            params: { accountId: 'acc-1' },
          },
          { key: 'add', name: SheetRoutes.AddAssets },
        ],
      } as never);

      NavigationControls.navigate(SheetRoutes.Send, {
        accountId: 'acc-1' as AccountId,
        recipientAddress: 'addr1',
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockPop).toHaveBeenCalledWith(1);
      expect(mockDispatch).toHaveBeenNthCalledWith(1, {
        type: 'POP',
        payload: 1,
      });

      await new Promise<void>(resolve => {
        queueMicrotask(resolve);
      });

      expect(mockSetParams).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientAddress: 'addr1',
          accountId: 'acc-1',
        }),
      );
      const secondDispatch = mockDispatch.mock.calls[1]?.[0] as {
        type: string;
        payload: Record<string, unknown>;
      };
      expect(secondDispatch?.type).toBe('SET_PARAMS');
      expect(secondDispatch?.payload).toMatchObject({
        recipientAddress: 'addr1',
        accountId: 'acc-1',
      });
    });

    it('setParams only when target is already focused', () => {
      const mockDispatch = vi.mocked(navigationRef.dispatch);
      const mockNavigate = vi.mocked(navigationRef.navigate);
      const mockIsReady = vi.mocked(navigationRef.isReady);
      const mockGetRootState = vi.mocked(navigationRef.getRootState);
      const mockGetCurrentRoute = vi.mocked(navigationRef.getCurrentRoute);

      mockIsReady.mockReturnValue(true);
      mockGetCurrentRoute.mockReturnValue({
        key: 'send',
        name: SheetRoutes.Send,
      } as never);
      mockGetRootState.mockReturnValue({
        index: 1,
        routes: [
          { key: 'root', name: SheetRoutes.RootStack },
          {
            key: 'send',
            name: SheetRoutes.Send,
            params: { accountId: 'acc-1' },
          },
        ],
      } as never);

      NavigationControls.navigate(SheetRoutes.Send, { recipientAddress: 'x' });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockPop).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockSetParams).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientAddress: 'x',
          accountId: 'acc-1',
        }),
      );
    });

    it('defers presenting a sheet route until an in-flight dismissal settles, then presents fresh', () => {
      const mockNavigate = vi.mocked(navigationRef.navigate);
      const mockIsReady = vi.mocked(navigationRef.isReady);
      const mockGetRootState = vi.mocked(navigationRef.getRootState);
      const mockGetCurrentRoute = vi.mocked(navigationRef.getCurrentRoute);
      const mockAddListener = vi.mocked(navigationRef.addListener);

      mockIsReady.mockReturnValue(true);

      const openState = {
        index: 1,
        routes: [
          { key: 'root', name: SheetRoutes.RootStack },
          { key: 'send', name: SheetRoutes.Send, params: {} },
        ],
      } as unknown as NavigationState;
      mockGetRootState.mockReturnValue(openState);
      mockGetCurrentRoute.mockReturnValue({
        key: 'send',
        name: SheetRoutes.Send,
      } as never);

      NavigationControls.closeSheet();
      expect(mockPopToTop).toHaveBeenCalledOnce();

      NavigationControls.navigate(SheetRoutes.Send, {
        accountId: 'acc-1' as AccountId,
      });

      // Must NOT present into the still-closing route.
      expect(mockNavigate).not.toHaveBeenCalled();

      const settledState = {
        index: 0,
        routes: [{ key: 'root', name: SheetRoutes.RootStack }],
      } as unknown as NavigationState;
      mockGetRootState.mockReturnValue(settledState);
      mockGetCurrentRoute.mockReturnValue({
        key: 'root',
        name: SheetRoutes.RootStack,
      } as never);

      const latestStateListener = mockAddListener.mock.calls
        .filter(([event]) => event === 'state')
        .at(-1)?.[1] as (event: { data: { state: NavigationState } }) => void;
      latestStateListener({ data: { state: settledState } });

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ name: SheetRoutes.Send }),
      );
    });
  });

  describe('closeSheet', () => {
    it('dismisses all sheet routes via popToTop and waits for the cascade to settle', () => {
      const mockDispatch = vi.mocked(navigationRef.dispatch);
      const mockIsReady = vi.mocked(navigationRef.isReady);
      const mockGetRootState = vi.mocked(navigationRef.getRootState);
      const mockAddListener = vi.mocked(navigationRef.addListener);

      mockIsReady.mockReturnValue(true);
      mockGetRootState.mockReturnValue({
        index: 3,
        routes: [
          { key: 'root', name: SheetRoutes.RootStack },
          { key: 'send', name: SheetRoutes.Send },
          { key: 'add-assets', name: SheetRoutes.AddAssets },
          { key: 'remove-account', name: SheetRoutes.RemoveAccount },
        ],
      } as never);

      NavigationControls.closeSheet();

      expect(mockPopToTop).toHaveBeenCalledOnce();
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'POP_TO_TOP' });
      // The dismissal is treated as settled only once the TrueSheet cascade
      // shrinks the stack back to the base route, so a state listener is
      // registered rather than the route being treated as popped immediately.
      expect(mockAddListener).toHaveBeenCalledWith(
        'state',
        expect.any(Function),
      );
    });

    it('does not count RootStack as a sheet route to dismiss', () => {
      const mockDispatch = vi.mocked(navigationRef.dispatch);
      const mockIsReady = vi.mocked(navigationRef.isReady);
      const mockGetRootState = vi.mocked(navigationRef.getRootState);

      mockIsReady.mockReturnValue(true);
      mockGetRootState.mockReturnValue({
        index: 0,
        routes: [{ key: 'root', name: SheetRoutes.RootStack }],
      } as never);

      NavigationControls.closeSheet();

      expect(mockPopToTop).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does nothing when navigation is not ready', () => {
      const mockDispatch = vi.mocked(navigationRef.dispatch);
      const mockIsReady = vi.mocked(navigationRef.isReady);

      mockIsReady.mockReturnValue(false);

      NavigationControls.closeSheet();

      expect(mockPopToTop).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});

describe('handleInteractiveSheetDismiss', () => {
  const stackedState = (flags?: {
    bottomSheetClosing?: boolean;
    topSheetClosing?: boolean;
  }): NavigationState =>
    ({
      index: 2,
      routes: [
        { key: 'root', name: SheetRoutes.RootStack },
        {
          key: 'send',
          name: SheetRoutes.Send,
          closing: flags?.bottomSheetClosing,
        },
        {
          key: 'add-assets',
          name: SheetRoutes.AddAssets,
          closing: flags?.topSheetClosing,
        },
      ],
    } as unknown as NavigationState);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(navigationRef.isReady).mockReturnValue(true);
  });

  it('closes the whole stack when the focused sheet is dismissed interactively', () => {
    vi.mocked(navigationRef.getRootState).mockReturnValue(stackedState());

    handleInteractiveSheetDismiss('add-assets');

    expect(mockPopToTop).toHaveBeenCalledOnce();
  });

  it('honours a programmatic dismiss (route already marked `closing`)', () => {
    vi.mocked(navigationRef.getRootState).mockReturnValue(
      stackedState({ topSheetClosing: true }),
    );

    handleInteractiveSheetDismiss('add-assets');

    expect(mockPopToTop).not.toHaveBeenCalled();
  });

  it('does nothing while a close-all cascade is already in progress', () => {
    vi.mocked(navigationRef.getRootState).mockReturnValue(
      stackedState({ bottomSheetClosing: true }),
    );

    handleInteractiveSheetDismiss('add-assets');

    expect(mockPopToTop).not.toHaveBeenCalled();
  });

  it('does nothing when only one sheet is open (dismissing it already returns to base)', () => {
    vi.mocked(navigationRef.getRootState).mockReturnValue({
      index: 1,
      routes: [
        { key: 'root', name: SheetRoutes.RootStack },
        { key: 'send', name: SheetRoutes.Send },
      ],
    } as unknown as NavigationState);

    handleInteractiveSheetDismiss('send');

    expect(mockPopToTop).not.toHaveBeenCalled();
  });

  it('does nothing when navigation is not ready', () => {
    vi.mocked(navigationRef.isReady).mockReturnValue(false);

    handleInteractiveSheetDismiss('add-assets');

    expect(mockPopToTop).not.toHaveBeenCalled();
  });

  it('does nothing when the route key is undefined', () => {
    handleInteractiveSheetDismiss(undefined);

    expect(mockPopToTop).not.toHaveBeenCalled();
  });

  it('does nothing when the root state has no routes', () => {
    vi.mocked(navigationRef.getRootState).mockReturnValue({
      index: 0,
      routes: [],
    } as unknown as NavigationState);

    handleInteractiveSheetDismiss('add-assets');

    expect(mockPopToTop).not.toHaveBeenCalled();
  });

  it('does nothing when the dismissing route key is not in the stack', () => {
    vi.mocked(navigationRef.getRootState).mockReturnValue(stackedState());

    handleInteractiveSheetDismiss('not-a-known-key');

    expect(mockPopToTop).not.toHaveBeenCalled();
  });
});

describe('sheetStackScreenListeners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(navigationRef.isReady).mockReturnValue(true);
  });

  it('wires sheetWillDismiss to close the whole stack for an interactive dismiss', () => {
    vi.mocked(navigationRef.getRootState).mockReturnValue({
      index: 2,
      routes: [
        { key: 'root', name: SheetRoutes.RootStack },
        { key: 'send', name: SheetRoutes.Send },
        { key: 'add-assets', name: SheetRoutes.AddAssets },
      ],
    } as unknown as NavigationState);

    sheetStackScreenListeners.sheetWillDismiss({ target: 'add-assets' });

    expect(mockPopToTop).toHaveBeenCalledOnce();
  });
});
