/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDappPopupFlow } from '../src/browser/hooks/useDappPopupFlow';

import type {
  PendingSignDataRequest,
  PendingSignTxRequest,
} from '../src/common/store/slice';

const mocks = vi.hoisted(() => ({
  requestSelector: '',
  request: null as PendingSignDataRequest | PendingSignTxRequest | null,
  dispatched: [] as { key: string; payload: unknown }[],
  dispatchers: new Map<string, (payload: unknown) => void>(),
}));

vi.mock('../src/common/hooks', () => ({
  useLaceSelector: (key: string) =>
    key === mocks.requestSelector ? mocks.request : false,
  // Two fidelities matter here. `ignoreArgs` calls the action creator with no
  // argument, as the real hook does (util-render/src/hooks/lace-context.ts), so
  // restoring that flag in production fails these tests rather than silently
  // dropping the id again. And the dispatcher is returned by identity, as that
  // hook's `useMemo` does — a fresh function per render re-creates the
  // handlers' `useCallback`, which would let a handler that closes over
  // `request` pass while production froze it on the first render.
  useDispatchLaceAction: (key: string, ignoreArgs = false) => {
    const id = `${key}:${ignoreArgs}`;
    let dispatch = mocks.dispatchers.get(id);
    if (!dispatch) {
      dispatch = (payload: unknown) => {
        mocks.dispatched.push({
          key,
          payload: ignoreArgs ? undefined : payload,
        });
      };
      mocks.dispatchers.set(id, dispatch);
    }
    return dispatch;
  },
}));

const flows = [
  {
    type: 'signTx' as const,
    requestSelector: 'cardanoDappConnector.selectPendingSignTxRequest',
    confirmKey: 'cardanoDappConnector.confirmSignTx',
    rejectKey: 'cardanoDappConnector.rejectSignTx',
    requestNamed: (requestId: string): PendingSignTxRequest => ({
      requestId,
      dappOrigin: 'https://dapp.example',
      dapp: { name: 'Test DApp', origin: 'https://dapp.example' },
      txHex: 'deadbeef',
      partialSign: false,
    }),
  },
  {
    type: 'signData' as const,
    requestSelector: 'cardanoDappConnector.selectPendingSignDataRequest',
    confirmKey: 'cardanoDappConnector.confirmSignData',
    rejectKey: 'cardanoDappConnector.rejectSignData',
    requestNamed: (requestId: string): PendingSignDataRequest => ({
      requestId,
      dappOrigin: 'https://dapp.example',
      dapp: { name: 'Test DApp', origin: 'https://dapp.example' },
      address: 'addr_test1qz',
      payload: 'cafebabe',
    }),
  },
];

const handlers: { confirm?: () => void; reject?: () => void } = {};

const Probe = ({ type }: { type: 'signData' | 'signTx' }) => {
  const { handleConfirm, handleReject } = useDappPopupFlow({ type });
  handlers.confirm = handleConfirm;
  handlers.reject = handleReject;
  return null;
};

describe.each(flows)(
  'useDappPopupFlow($type)',
  ({ type, requestSelector, confirmKey, rejectKey, requestNamed }) => {
    beforeEach(() => {
      mocks.requestSelector = requestSelector;
      mocks.request = null;
      mocks.dispatched = [];
    });

    it('names the request it is showing on confirm and on reject', () => {
      mocks.request = requestNamed('req-a');

      render(<Probe type={type} />);
      handlers.confirm?.();
      handlers.reject?.();

      expect(mocks.dispatched).toEqual([
        { key: confirmKey, payload: { requestId: 'req-a' } },
        { key: rejectKey, payload: { requestId: 'req-a' } },
      ]);
    });

    it('names the request it last showed when dismissed after that request was cleared', () => {
      mocks.request = requestNamed('req-a');
      const { rerender, unmount } = render(<Probe type={type} />);

      mocks.request = null;
      rerender(<Probe type={type} />);
      unmount();

      expect(mocks.dispatched).toEqual([
        { key: rejectKey, payload: { requestId: 'req-a' } },
      ]);
    });

    it('rejects the request that inherited the view, not the one already answered', () => {
      mocks.request = requestNamed('req-a');
      const { rerender, unmount } = render(<Probe type={type} />);
      handlers.confirm?.();

      mocks.request = requestNamed('req-b');
      rerender(<Probe type={type} />);
      unmount();

      expect(mocks.dispatched).toEqual([
        { key: confirmKey, payload: { requestId: 'req-a' } },
        { key: rejectKey, payload: { requestId: 'req-b' } },
      ]);
    });

    it('names the request that inherited the view when that one is answered', () => {
      mocks.request = requestNamed('req-a');
      const { rerender } = render(<Probe type={type} />);

      mocks.request = requestNamed('req-b');
      rerender(<Probe type={type} />);
      handlers.confirm?.();

      expect(mocks.dispatched).toEqual([
        { key: confirmKey, payload: { requestId: 'req-b' } },
      ]);
    });

    it('answers an answered request once, however often it re-renders', () => {
      mocks.request = requestNamed('req-a');
      const { rerender, unmount } = render(<Probe type={type} />);
      handlers.confirm?.();

      rerender(<Probe type={type} />);
      unmount();

      expect(mocks.dispatched).toEqual([
        { key: confirmKey, payload: { requestId: 'req-a' } },
      ]);
    });

    it('leaves the answer unattributed when it never showed a request', () => {
      const { unmount } = render(<Probe type={type} />);

      unmount();

      expect(mocks.dispatched).toEqual([
        { key: rejectKey, payload: { requestId: undefined } },
      ]);
    });
  },
);
