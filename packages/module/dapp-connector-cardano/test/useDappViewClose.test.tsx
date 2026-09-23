/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import React, { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CARDANO_DAPP_SIGN_TX_LOCATION } from '../src/browser/const';
import { useDappPopupFlow } from '../src/browser/hooks/useDappPopupFlow';
import { useDappViewClose } from '../src/browser/hooks/useDappViewClose';

import type { PendingSignTxRequest } from '../src/common/store/slice';

const mocks = vi.hoisted(() => ({
  request: null as PendingSignTxRequest | null,
  activeSheetPage: null as unknown,
  dispatched: [] as { key: string; payload: unknown }[],
  dispatchers: new Map<string, (payload: unknown) => void>(),
}));

vi.mock('../src/common/hooks', () => ({
  useLaceSelector: (key: string) => {
    if (key === 'cardanoDappConnector.selectPendingSignTxRequest')
      return mocks.request;
    if (key === 'views.getActiveSheetPage') return mocks.activeSheetPage;
    return false;
  },
  // The dispatcher is returned by identity, as the real hook's `useMemo` does
  // (util-render/src/hooks/lace-context.ts): a fresh function per render would
  // re-create the close callback and hide a handler frozen on a stale surface.
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

const requestNamed = (requestId: string): PendingSignTxRequest => ({
  requestId,
  dappOrigin: 'https://dapp.example',
  dapp: { name: 'Test DApp', origin: 'https://dapp.example' },
  txHex: 'deadbeef',
  partialSign: false,
});

const openSheet = { route: 'SignTx', params: {}, targetViewId: 'side-panel-1' };

const handlers: { reject?: () => void } = {};

/** Mirrors CardanoDappSignTx / CardanoDappSignData: a sheet, so no location. */
const SheetView = () => {
  const requestIdRef = useRef<string | undefined>(undefined);
  const closeDappView = useDappViewClose(undefined, requestIdRef);
  const { request, handleReject } = useDappPopupFlow({
    type: 'signTx',
    onReject: closeDappView,
  });
  if (request && requestIdRef.current !== request.requestId) {
    requestIdRef.current = request.requestId;
  }
  handlers.reject = handleReject;
  return null;
};

/** Mirrors CardanoDappSignTxPopup: owns a popup window, so it names one. */
const PopupView = ({
  requestIdRef,
}: {
  requestIdRef?: { current: string | undefined };
}) => {
  const closeDappView = useDappViewClose(
    CARDANO_DAPP_SIGN_TX_LOCATION,
    requestIdRef,
  );
  const { handleReject } = useDappPopupFlow({
    type: 'signTx',
    onReject: closeDappView,
  });
  handlers.reject = handleReject;
  return null;
};

describe('closing a dApp sign view', () => {
  let closeWindow: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mocks.request = null;
    mocks.activeSheetPage = null;
    mocks.dispatched = [];
    closeWindow = vi.spyOn(window, 'close').mockImplementation(() => undefined);
  });

  it('dismisses only the sheet when a sheet view declines its request', () => {
    mocks.request = requestNamed('req-a');
    mocks.activeSheetPage = openSheet;

    render(<SheetView />);
    handlers.reject?.();

    expect(mocks.dispatched).toEqual([
      {
        key: 'cardanoDappConnector.rejectSignTx',
        payload: { requestId: 'req-a' },
      },
      {
        key: 'cardanoDappConnector.closeSheetRequested',
        payload: { requestId: 'req-a' },
      },
    ]);
    expect(closeWindow).not.toHaveBeenCalled();
  });

  it('leaves the side panel open when a queued request inherits the sheet and is then torn down', () => {
    mocks.request = requestNamed('req-a');
    mocks.activeSheetPage = openSheet;
    const { rerender, unmount } = render(<SheetView />);
    handlers.reject?.();

    // The decline landed: the sheet is dismissed, so nothing reports one open.
    mocks.activeSheetPage = null;
    mocks.request = null;
    rerender(<SheetView />);

    // The queue drained and served its successor into this same instance.
    mocks.request = requestNamed('req-b');
    rerender(<SheetView />);

    unmount();

    expect(closeWindow).not.toHaveBeenCalled();
    expect(mocks.dispatched).toEqual([
      {
        key: 'cardanoDappConnector.rejectSignTx',
        payload: { requestId: 'req-a' },
      },
      {
        key: 'cardanoDappConnector.closeSheetRequested',
        payload: { requestId: 'req-a' },
      },
      {
        key: 'cardanoDappConnector.rejectSignTx',
        payload: { requestId: 'req-b' },
      },
      {
        key: 'cardanoDappConnector.closeSheetRequested',
        payload: { requestId: 'req-b' },
      },
    ]);
  });

  it('leaves the side panel open when a sheet view is torn down unanswered', () => {
    mocks.request = requestNamed('req-a');
    mocks.activeSheetPage = null;

    const { unmount } = render(<SheetView />);
    unmount();

    expect(closeWindow).not.toHaveBeenCalled();
  });

  it('names the request the popup is showing, read at close time', () => {
    mocks.request = requestNamed('req-a');
    const requestIdRef = { current: 'req-a' as string | undefined };

    render(<PopupView requestIdRef={requestIdRef} />);
    // A queued request takes the window over after the handler is built.
    requestIdRef.current = 'req-b';
    handlers.reject?.();

    expect(mocks.dispatched).toContainEqual({
      key: 'cardanoDappConnector.closePopupRequested',
      payload: {
        location: CARDANO_DAPP_SIGN_TX_LOCATION,
        requestId: 'req-b',
      },
    });
  });

  it('closes its own popup, not a sheet another view has open', () => {
    mocks.request = requestNamed('req-a');
    mocks.activeSheetPage = openSheet;

    render(<PopupView />);
    handlers.reject?.();

    expect(mocks.dispatched).toEqual([
      {
        key: 'cardanoDappConnector.rejectSignTx',
        payload: { requestId: 'req-a' },
      },
      {
        key: 'cardanoDappConnector.closePopupRequested',
        payload: {
          location: CARDANO_DAPP_SIGN_TX_LOCATION,
          requestId: undefined,
        },
      },
    ]);
  });
});
