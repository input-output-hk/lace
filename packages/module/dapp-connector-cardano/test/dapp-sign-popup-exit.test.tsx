/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CARDANO_DAPP_SIGN_DATA_LOCATION,
  CARDANO_DAPP_SIGN_TX_LOCATION,
} from '../src/browser/const';
import { CardanoDappSignData } from '../src/browser/views/CardanoDappSignData';
import { CardanoDappSignDataPopup } from '../src/browser/views/CardanoDappSignDataPopup';
import { CardanoDappSignTx } from '../src/browser/views/CardanoDappSignTx';
import { CardanoDappSignTxPopup } from '../src/browser/views/CardanoDappSignTxPopup';

import type {
  PendingSignDataRequest,
  PendingSignTxRequest,
} from '../src/common/store/slice';

type LayoutButton = { label: string; action: () => void; disabled?: boolean };

const mocks = vi.hoisted(() => ({
  request: null as PendingSignDataRequest | PendingSignTxRequest | null,
  isError: false,
  handleConfirm: vi.fn(),
  handleReject: vi.fn(),
  closeDappView: vi.fn(),
  viewCloseArgs: [] as unknown[][],
  layoutProps: {
    current: null as {
      primaryButton?: LayoutButton;
      secondaryButton?: LayoutButton;
    } | null,
  },
}));

vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../src/browser/hooks', () => ({
  useDappPopupFlow: () => ({
    request: mocks.request,
    handleConfirm: mocks.handleConfirm,
    handleReject: mocks.handleReject,
    isLoading: !mocks.request,
    isError: mocks.isError,
  }),
  useDappViewClose: (...args: unknown[]) => {
    mocks.viewCloseArgs.push(args);
    return mocks.closeDappView;
  },
}));

vi.mock('../src/common/components', () => ({
  SignTxContent: () => <div />,
  SignTxError: () => <div />,
  SignTxLoadingContent: () => <div />,
  SignDataContent: () => <div />,
  SignDataError: () => <div />,
  SignTxLayout: () => <div />,
  SignTxResult: () => <div />,
  SignDataLayout: () => <div />,
  SignDataResult: () => <div />,
}));

vi.mock('../src/common/hooks', () => ({
  useLaceSelector: (key: string) => {
    if (key === 'cardanoDappConnector.selectSessionAccountByOrigin') return {};
    if (key === 'wallets.selectAll') return [];
    return undefined;
  },
}));

vi.mock('../src/common/hooks/useSignDataDRepKeyHash', () => ({
  useSignDataDRepKeyHash: () => undefined,
}));

vi.mock('@lace-contract/wallet-repo', () => ({
  isHardwareWallet: () => false,
}));

vi.mock('../src/common/hooks/useSignTxData', () => ({
  useSignTxData: () => ({ transactionInfo: null }),
}));

vi.mock('../src/common/hooks/useSignDataAccountInfo', () => ({
  useSignDataAccountInfo: () => undefined,
}));

vi.mock('@lace-lib/ui-extension', () => ({
  DappConnectorLayoutV2: ({
    children,
    primaryButton,
    secondaryButton,
  }: {
    children?: React.ReactNode;
    primaryButton?: LayoutButton;
    secondaryButton?: LayoutButton;
  }) => {
    mocks.layoutProps.current = { primaryButton, secondaryButton };
    return <div>{children}</div>;
  },
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  Text: {
    S: ({ children }: { children?: React.ReactNode }) => (
      <span>{children}</span>
    ),
  },
  spacing: { M: 12, S: 8 },
}));

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

const signTxRequest: PendingSignTxRequest = {
  requestId: 'req-tx-1',
  dappOrigin: 'https://dapp.example',
  dapp: { name: 'Test DApp', origin: 'https://dapp.example' },
  txHex: 'deadbeef',
  partialSign: false,
};

const signDataRequest: PendingSignDataRequest = {
  requestId: 'req-data-1',
  dappOrigin: 'https://dapp.example',
  dapp: { name: 'Test DApp', origin: 'https://dapp.example' },
  address: 'addr_test1qz',
  payload: 'cafebabe',
};

describe.each([
  {
    name: 'CardanoDappSignTxPopup',
    Popup: CardanoDappSignTxPopup,
    request: signTxRequest as PendingSignDataRequest | PendingSignTxRequest,
    closeLabel: 'dapp-connector.cardano.sign-tx.result.close',
    declineLabel: 'dapp-connector.cardano.sign-tx.cancel',
  },
  {
    name: 'CardanoDappSignDataPopup',
    Popup: CardanoDappSignDataPopup,
    request: signDataRequest as PendingSignDataRequest | PendingSignTxRequest,
    closeLabel: 'dapp-connector.cardano.sign-data.result.close',
    declineLabel: 'dapp-connector.cardano.sign-data.deny',
  },
])('$name', ({ Popup, request, closeLabel, declineLabel }) => {
  beforeEach(() => {
    mocks.request = null;
    mocks.isError = false;
    mocks.handleConfirm.mockClear();
    mocks.handleReject.mockClear();
    mocks.closeDappView.mockClear();
    mocks.viewCloseArgs = [];
    mocks.layoutProps.current = null;
  });

  it('offers a plain close on the error state, dispatching no reject', () => {
    mocks.isError = true;

    render(<Popup />);
    mocks.layoutProps.current?.secondaryButton?.action();

    expect(mocks.layoutProps.current?.secondaryButton?.label).toBe(closeLabel);
    expect(mocks.closeDappView).toHaveBeenCalled();
    expect(mocks.handleReject).not.toHaveBeenCalled();
  });

  it('declines the request through its Cancel while it is still unanswered', () => {
    mocks.request = request;

    render(<Popup />);
    mocks.layoutProps.current?.secondaryButton?.action();

    expect(mocks.layoutProps.current?.secondaryButton?.label).toBe(
      declineLabel,
    );
    expect(mocks.handleReject).toHaveBeenCalled();
  });

  it('does not treat the request that inherited the window as already confirmed', () => {
    mocks.request = request;
    const { rerender } = render(<Popup />);
    mocks.layoutProps.current?.primaryButton?.action();

    mocks.request = { ...request, requestId: 'req-successor' };
    rerender(<Popup />);
    mocks.request = null;
    rerender(<Popup />);

    expect(mocks.handleConfirm).toHaveBeenCalled();
    expect(mocks.closeDappView).not.toHaveBeenCalled();
  });
});

describe('the surface a dApp sign view closes', () => {
  beforeEach(() => {
    mocks.request = null;
    mocks.isError = false;
    mocks.viewCloseArgs = [];
  });

  it.each([
    { name: 'CardanoDappSignTx', View: CardanoDappSignTx },
    { name: 'CardanoDappSignData', View: CardanoDappSignData },
  ])(
    '$name names no popup, so it closes as a sheet, and names its request',
    ({ View }) => {
      mocks.request = signTxRequest;

      render(<View requestId={signTxRequest.requestId} />);

      const [popupLocation, requestIdRef] = mocks.viewCloseArgs[0] ?? [];
      expect(popupLocation).toBeUndefined();
      expect(requestIdRef).toEqual({ current: signTxRequest.requestId });
    },
  );

  it.each([
    { name: 'CardanoDappSignTx', View: CardanoDappSignTx },
    { name: 'CardanoDappSignData', View: CardanoDappSignData },
  ])(
    '$name follows the request that inherited the sheet, and keeps it once cleared',
    ({ View }) => {
      mocks.request = signTxRequest;
      const { rerender } = render(<View requestId={signTxRequest.requestId} />);
      const [, requestIdRef] = (mocks.viewCloseArgs[0] ?? []) as [
        unknown,
        { current: string | undefined },
      ];

      // `openDappSheet` re-presents the slot and publishes the successor's
      // pending request together, so the route moves with it.
      mocks.request = { ...signTxRequest, requestId: 'req-successor' };
      rerender(<View requestId="req-successor" />);
      expect(requestIdRef.current).toBe('req-successor');

      // The close is dispatched from the teardown, by when an answered or
      // failed request has already been cleared — the id has to outlive it.
      mocks.request = null;
      rerender(<View requestId="req-successor" />);
      expect(requestIdRef.current).toBe('req-successor');
    },
  );

  it.each([
    { name: 'CardanoDappSignTx', View: CardanoDappSignTx },
    { name: 'CardanoDappSignData', View: CardanoDappSignData },
  ])(
    '$name names the request its sheet presents even having synced none',
    ({ View }) => {
      // The state a port drop leaves behind: the request is settled into an
      // error and cleared before this view first renders, so the selector
      // never yields one. The sheet stays presented, so its close still has
      // to name the request `closeRequestedSheet` matches the slot against.
      mocks.request = null;
      mocks.isError = true;

      render(<View requestId="req-from-route" />);

      const [popupLocation, requestIdRef] = mocks.viewCloseArgs[0] ?? [];
      expect(popupLocation).toBeUndefined();
      expect(requestIdRef).toEqual({ current: 'req-from-route' });
    },
  );

  it.each([
    { name: 'CardanoDappSignTx', View: CardanoDappSignTx },
    { name: 'CardanoDappSignData', View: CardanoDappSignData },
  ])(
    '$name names the successor that inherited the sheet, not the request it replaced',
    ({ View }) => {
      mocks.request = signTxRequest;
      const { rerender } = render(<View requestId={signTxRequest.requestId} />);
      const [, requestIdRef] = (mocks.viewCloseArgs[0] ?? []) as [
        unknown,
        { current: string | undefined },
      ];

      // The successor inherits this sheet without a remount, and its own port
      // drops before its request ever reaches the view — so nothing but the
      // route says which request the slot now holds.
      mocks.request = null;
      mocks.isError = true;
      rerender(<View requestId="req-successor" />);

      expect(requestIdRef.current).toBe('req-successor');
    },
  );

  it.each([
    {
      name: 'CardanoDappSignTxPopup',
      View: CardanoDappSignTxPopup,
      location: CARDANO_DAPP_SIGN_TX_LOCATION,
    },
    {
      name: 'CardanoDappSignDataPopup',
      View: CardanoDappSignDataPopup,
      location: CARDANO_DAPP_SIGN_DATA_LOCATION,
    },
  ])('$name names its own popup window', ({ View, location }) => {
    mocks.request = signTxRequest;

    render(<View />);

    expect(mocks.viewCloseArgs[0]?.[0]).toBe(location);
  });
});
