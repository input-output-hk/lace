/**
 * @vitest-environment jsdom
 */
import { AccountId } from '@lace-contract/wallet-repo';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinDappSignMessageSheet } from '../../src/views/BitcoinDappSignMessageSheet';

import type { SignMessageContentProps } from '../../src/components/SignMessageContent';
import type { SignReviewResultContentProps } from '../../src/components/SignReviewResultContent';
import type { SignMessageAccountInfo } from '../../src/hooks';
import type { PendingSignMessageRequest } from '../../src/store/slice';

const mocks = vi.hoisted(() => ({
  request: null as PendingSignMessageRequest | null,
  isComplete: false,
  isError: false,
  accountInfo: undefined as SignMessageAccountInfo | undefined,
  handleConfirm: vi.fn(),
  handleReject: vi.fn(),
  setOptions: vi.fn(),
  dispatched: [] as { key: string; payload: unknown }[],
  messageContentProps: { current: null as SignMessageContentProps | null },
  resultContentProps: {
    current: null as SignReviewResultContentProps | null,
  },
}));

vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ setOptions: mocks.setOptions }),
}));

vi.mock('../../src/hooks', () => ({
  useDappPopupFlow: () => ({
    request: mocks.request,
    isComplete: mocks.isComplete,
    isError: mocks.isError,
    handleConfirm: mocks.handleConfirm,
    handleReject: mocks.handleReject,
  }),
  useDispatchLaceAction: (key: string) => (payload: unknown) => {
    mocks.dispatched.push({ key, payload });
  },
  useSignMessageAccountInfo: () => mocks.accountInfo,
}));

vi.mock('../../src/components', async () => {
  const { SignSheetScroll } = await import(
    '../../src/components/SignSheetScroll'
  );
  return {
    SignSheetScroll,
    SignMessageContent: (props: SignMessageContentProps) => {
      mocks.messageContentProps.current = props;
      return <div data-testid="sign-message-content" />;
    },
    SignReviewLoadingContent: () => <div data-testid="sign-review-loading" />,
    SignReviewResultContent: (props: SignReviewResultContentProps) => {
      mocks.resultContentProps.current = props;
      return <div data-testid="sign-review-result" />;
    },
  };
});

vi.mock('@lace-lib/ui-toolkit', () => ({
  Sheet: {
    Header: () => null,
    Footer: () => null,
    Scroll: ({
      children,
      testID,
      contentContainerStyle,
      showsVerticalScrollIndicator,
    }: {
      children?: React.ReactNode;
      testID?: string;
      contentContainerStyle?: unknown;
      showsVerticalScrollIndicator?: boolean;
    }) => (
      <div
        data-testid={testID}
        data-show-indicator={String(showsVerticalScrollIndicator)}
        data-style={JSON.stringify(contentContainerStyle)}>
        {children}
      </div>
    ),
  },
  spacing: { M: 16, S: 8 },
  footerHeight: { horizontal: 80 },
  useTheme: () => ({ theme: { brand: { white: '#fff' } } }),
}));

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
}));

const dapp = { name: 'Test DApp', origin: 'https://dapp.example' };

const request: PendingSignMessageRequest = {
  requestId: 'req-1',
  dappOrigin: dapp.origin,
  dapp,
  address: 'bc1qtestaddress',
  message: 'Hello world',
  signatureType: 'ecdsa',
};

describe('BitcoinDappSignMessageSheet', () => {
  beforeEach(() => {
    mocks.request = null;
    mocks.isComplete = false;
    mocks.isError = false;
    mocks.accountInfo = undefined;
    mocks.handleConfirm.mockClear();
    mocks.handleReject.mockClear();
    mocks.setOptions.mockClear();
    mocks.dispatched = [];
    mocks.messageContentProps.current = null;
    mocks.resultContentProps.current = null;
  });

  it('renders the scroll container with the Cardano-matching padding and no scroll indicator', () => {
    render(<BitcoinDappSignMessageSheet />);

    const scroll = screen.getByTestId('bitcoin-sign-message-sheet-scroll');
    expect(scroll.dataset.showIndicator).toBe('false');
    expect(JSON.parse(scroll.dataset.style ?? '{}')).toEqual({
      flexGrow: 1,
      width: '100%',
      paddingHorizontal: 16,
      paddingBottom: 80,
    });
  });

  it('shows the loading content while the request is not ready', () => {
    render(<BitcoinDappSignMessageSheet />);

    expect(screen.getByTestId('sign-review-loading')).toBeTruthy();
    expect(screen.queryByTestId('sign-message-content')).toBeNull();
  });

  it('shows the message content, with the resolved account, once the request is ready', () => {
    mocks.request = request;
    mocks.accountInfo = {
      name: 'Bitcoin 0',
      accountId: AccountId('bitcoin-account-0'),
    };

    render(<BitcoinDappSignMessageSheet />);

    expect(screen.queryByTestId('sign-review-loading')).toBeNull();
    expect(screen.getByTestId('sign-message-content')).toBeTruthy();
    expect(mocks.messageContentProps.current?.dapp).toEqual({
      icon: { fallback: dapp.name },
      name: dapp.name,
      origin: dapp.origin,
    });
    expect(mocks.messageContentProps.current?.accountInfo).toEqual(
      mocks.accountInfo,
    );
  });

  it('sets the sheet header and footer chrome via navigation.setOptions', () => {
    mocks.request = request;

    render(<BitcoinDappSignMessageSheet />);

    const options = mocks.setOptions.mock.calls.at(-1)?.[0] as
      | { header?: unknown; footer?: unknown }
      | undefined;
    expect(options?.header).toBeDefined();
    expect(options?.footer).toBeDefined();
  });

  it('replaces the review content with the success result when signing completes', () => {
    mocks.isComplete = true;

    render(<BitcoinDappSignMessageSheet />);

    expect(screen.getByTestId('sign-review-result')).toBeTruthy();
    expect(
      screen.queryByTestId('bitcoin-sign-message-sheet-scroll'),
    ).toBeNull();
    expect(mocks.resultContentProps.current?.state).toBe('success');
    expect(mocks.resultContentProps.current?.descriptionKey).toBe(
      'dapp-connector.bitcoin.sign-message.result.success.description',
    );
  });

  it('shows the failure result when signing errors', () => {
    mocks.isError = true;

    render(<BitcoinDappSignMessageSheet />);

    expect(screen.getByTestId('sign-review-result')).toBeTruthy();
    expect(mocks.resultContentProps.current?.state).toBe('failure');
    expect(mocks.resultContentProps.current?.descriptionKey).toBe(
      'dapp-connector.bitcoin.sign-message.result.failure.description',
    );
  });

  it('leaves the navigation options to the result screen while it is showing', () => {
    mocks.isComplete = true;

    render(<BitcoinDappSignMessageSheet />);

    expect(mocks.setOptions).not.toHaveBeenCalled();
  });

  it('closes the sheet via setActiveSheetPage(null) from the result Close button', () => {
    mocks.isComplete = true;

    render(<BitcoinDappSignMessageSheet />);

    mocks.resultContentProps.current?.onClose();
    expect(mocks.dispatched).toContainEqual({
      key: 'views.setActiveSheetPage',
      payload: null,
    });
  });
});
