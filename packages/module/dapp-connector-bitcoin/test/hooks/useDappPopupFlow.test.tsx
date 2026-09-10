/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  selectors: {} as Record<string, unknown>,
  dispatched: [] as Array<{ key: string; args: unknown[] }>,
}));

vi.mock('../../src/hooks/storeHooks', () => ({
  useLaceSelector: (key: string) => mocks.selectors[key],
  useDispatchLaceAction:
    (key: string, ignoreArgs = false) =>
    (...args: unknown[]) => {
      mocks.dispatched.push({ key, args: ignoreArgs ? [] : args });
    },
}));

import { useDappPopupFlow } from '../../src/hooks/useDappPopupFlow';

const setSelectors = (overrides: Record<string, unknown>) => {
  mocks.selectors = {
    'bitcoinDappConnector.selectPendingSignMessageRequest': null,
    'bitcoinDappConnector.selectPendingSignPsbtRequest': null,
    'bitcoinDappConnector.selectSignMessageCompleted': false,
    'bitcoinDappConnector.selectSignMessageError': false,
    'bitcoinDappConnector.selectSignPsbtCompleted': false,
    'bitcoinDappConnector.selectSignPsbtError': false,
    ...overrides,
  };
};

describe('useDappPopupFlow loading state', () => {
  beforeEach(() => {
    mocks.dispatched = [];
    setSelectors({});
  });

  it('reports isLoading when there is no pending request', () => {
    const { result } = renderHook(() =>
      useDappPopupFlow({ type: 'signMessage' }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.request).toBeNull();
  });

  it('returns the request once one is pending', () => {
    const request = { requestId: 'req-1' };
    setSelectors({
      'bitcoinDappConnector.selectPendingSignMessageRequest': request,
    });

    const { result } = renderHook(() =>
      useDappPopupFlow({ type: 'signMessage' }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.request).toBe(request);
  });
});

describe('useDappPopupFlow confirm and reject dispatch', () => {
  beforeEach(() => {
    mocks.dispatched = [];
    setSelectors({});
  });

  it('dispatches confirmSignMessage and calls onConfirm on handleConfirm', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useDappPopupFlow({ type: 'signMessage', onConfirm }),
    );

    result.current.handleConfirm();

    expect(mocks.dispatched).toContainEqual({
      key: 'bitcoinDappConnector.confirmSignMessage',
      args: [],
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('dispatches rejectSignMessage and calls onReject on handleReject', () => {
    const onReject = vi.fn();
    const { result } = renderHook(() =>
      useDappPopupFlow({ type: 'signMessage', onReject }),
    );

    result.current.handleReject();

    expect(mocks.dispatched).toContainEqual({
      key: 'bitcoinDappConnector.rejectSignMessage',
      args: [],
    });
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('dispatches confirmSignPsbt for the signPsbt flow', () => {
    const { result } = renderHook(() => useDappPopupFlow({ type: 'signPsbt' }));

    result.current.handleConfirm();

    expect(mocks.dispatched).toContainEqual({
      key: 'bitcoinDappConnector.confirmSignPsbt',
      args: [],
    });
  });

  it('dispatches rejectSignPsbt for the signPsbt flow', () => {
    const { result } = renderHook(() => useDappPopupFlow({ type: 'signPsbt' }));

    result.current.handleReject();

    expect(mocks.dispatched).toContainEqual({
      key: 'bitcoinDappConnector.rejectSignPsbt',
      args: [],
    });
  });
});

describe('useDappPopupFlow unmount-reject behavior', () => {
  beforeEach(() => {
    mocks.dispatched = [];
    setSelectors({});
  });

  it('dispatches reject on unmount when the user never responded', () => {
    const onReject = vi.fn();
    const { unmount } = renderHook(() =>
      useDappPopupFlow({ type: 'signMessage', onReject }),
    );

    unmount();

    expect(mocks.dispatched).toContainEqual({
      key: 'bitcoinDappConnector.rejectSignMessage',
      args: [],
    });
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch reject again on unmount after the user confirmed', () => {
    const { result, unmount } = renderHook(() =>
      useDappPopupFlow({ type: 'signMessage' }),
    );

    result.current.handleConfirm();
    mocks.dispatched = [];
    unmount();

    expect(mocks.dispatched).toEqual([]);
  });

  it('does not dispatch reject again on unmount after the user rejected', () => {
    const { result, unmount } = renderHook(() =>
      useDappPopupFlow({ type: 'signMessage' }),
    );

    result.current.handleReject();
    mocks.dispatched = [];
    unmount();

    expect(mocks.dispatched).toEqual([]);
  });
});
