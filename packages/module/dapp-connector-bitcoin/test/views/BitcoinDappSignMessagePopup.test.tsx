/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinDappSignMessagePopup } from '../../src/views/BitcoinDappSignMessagePopup';

import type { PendingSignMessageRequest } from '../../src/store/slice';

type LayoutButton = { label: string; action: () => void; disabled?: boolean };

const mocks = vi.hoisted(() => ({
  request: null as PendingSignMessageRequest | null,
  isError: false,
  handleConfirm: vi.fn(),
  handleReject: vi.fn(),
  closeDappView: vi.fn(),
  viewCloseLocation: { current: undefined as string | undefined },
  hookOptions: { current: null as { onReject?: () => void } | null },
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

vi.mock('../../src/hooks', () => ({
  useDappPopupFlow: (options: { onReject?: () => void }) => ({
    request: mocks.request,
    handleConfirm: mocks.handleConfirm,
    handleReject: mocks.handleReject,
    isError: mocks.isError,
    options: (mocks.hookOptions.current = options),
  }),
  useDappViewClose: (location?: string) => {
    mocks.viewCloseLocation.current = location;
    return mocks.closeDappView;
  },
  useSignMessageAccountInfo: () => ({ name: 'Account 1', index: 0 }),
}));

vi.mock('../../src/components', () => ({
  SignMessageContent: () => <div data-testid="sign-message-content" />,
  SignReviewLoadingContent: () => <div data-testid="sign-review-loading" />,
  SignReviewErrorContent: () => <div data-testid="sign-review-error" />,
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

const request: PendingSignMessageRequest = {
  requestId: 'req-1',
  dappOrigin: 'https://dapp.example',
  dapp: { name: 'Test DApp', origin: 'https://dapp.example' },
  address: 'bc1qown',
  message: 'hello',
  signatureType: 'ecdsa',
};

describe('BitcoinDappSignMessagePopup', () => {
  beforeEach(() => {
    mocks.request = null;
    mocks.isError = false;
    mocks.handleConfirm.mockClear();
    mocks.handleReject.mockClear();
    mocks.closeDappView.mockClear();
    mocks.layoutProps.current = null;
    mocks.viewCloseLocation.current = undefined;
    mocks.hookOptions.current = null;
  });

  it('closes through the sign message popup location instead of window.close', () => {
    render(<BitcoinDappSignMessagePopup />);

    expect(mocks.viewCloseLocation.current).toBe('/bitcoin-dapp-sign-message');
  });

  it('shows the loading content until the request arrives', () => {
    render(<BitcoinDappSignMessagePopup />);

    expect(screen.getByTestId('sign-review-loading')).toBeTruthy();
    expect(mocks.layoutProps.current?.primaryButton?.disabled).toBe(true);
  });

  it('shows the message content once the request is ready', () => {
    mocks.request = request;

    render(<BitcoinDappSignMessagePopup />);

    expect(screen.getByTestId('sign-message-content')).toBeTruthy();
    expect(screen.queryByTestId('sign-review-loading')).toBeNull();
  });

  it('rejects through the view close so the error state has an exit', () => {
    mocks.isError = true;

    render(<BitcoinDappSignMessagePopup />);

    expect(mocks.hookOptions.current?.onReject).toBe(mocks.closeDappView);
    expect(mocks.layoutProps.current?.secondaryButton).toBeDefined();
  });

  it('offers a plain close on the error state, dispatching no reject', () => {
    mocks.isError = true;

    render(<BitcoinDappSignMessagePopup />);
    mocks.layoutProps.current?.secondaryButton?.action();

    expect(mocks.layoutProps.current?.secondaryButton?.label).toBe(
      'dapp-connector.bitcoin.result.close',
    );
    expect(mocks.closeDappView).toHaveBeenCalled();
    expect(mocks.handleReject).not.toHaveBeenCalled();
  });

  it('declines the request through its Cancel while it is still unanswered', () => {
    mocks.request = request;

    render(<BitcoinDappSignMessagePopup />);
    mocks.layoutProps.current?.secondaryButton?.action();

    expect(mocks.layoutProps.current?.secondaryButton?.label).toBe(
      'dapp-connector.bitcoin.sign-message.cancel',
    );
    expect(mocks.handleReject).toHaveBeenCalled();
  });

  it('shows the error content when the signing result failed, with no request left', () => {
    mocks.isError = true;

    render(<BitcoinDappSignMessagePopup />);

    expect(screen.getByTestId('sign-review-error')).toBeTruthy();
    expect(screen.queryByTestId('sign-review-loading')).toBeNull();
    expect(mocks.layoutProps.current?.primaryButton).toBeUndefined();
  });

  it('keeps the popup open on a signing failure after the user confirmed', () => {
    mocks.request = request;
    const { rerender } = render(<BitcoinDappSignMessagePopup />);
    mocks.layoutProps.current?.primaryButton?.action();

    mocks.request = null;
    mocks.isError = true;
    rerender(<BitcoinDappSignMessagePopup />);

    expect(mocks.closeDappView).not.toHaveBeenCalled();
    expect(screen.getByTestId('sign-review-error')).toBeTruthy();
  });

  it('closes the popup once a confirmed signing succeeds', () => {
    mocks.request = request;
    const { rerender } = render(<BitcoinDappSignMessagePopup />);
    mocks.layoutProps.current?.primaryButton?.action();

    mocks.request = null;
    rerender(<BitcoinDappSignMessagePopup />);

    expect(mocks.closeDappView).toHaveBeenCalled();
  });
});
