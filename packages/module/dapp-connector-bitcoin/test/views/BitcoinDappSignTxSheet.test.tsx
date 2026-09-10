/**
 * @vitest-environment jsdom
 */
import { AccountId } from '@lace-contract/wallet-repo';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinDappSignTxSheet } from '../../src/views/BitcoinDappSignTxSheet';

import type { SignPsbtContentProps } from '../../src/components/SignPsbtContent';
import type { SignReviewResultContentProps } from '../../src/components/SignReviewResultContent';
import type { PendingSignPsbtRequest } from '../../src/store/slice';

const mocks = vi.hoisted(() => ({
  request: null as PendingSignPsbtRequest | null,
  isComplete: false,
  isError: false,
  isResolvingInputs: false,
  inspection: undefined as unknown,
  hasError: false,
  handleConfirm: vi.fn(),
  handleReject: vi.fn(),
  setOptions: vi.fn(),
  dispatched: [] as { key: string; payload: unknown }[],
  psbtContentProps: { current: null as SignPsbtContentProps | null },
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
  useSignPsbtData: () => ({
    inspection: mocks.inspection,
    isResolvingInputs: mocks.isResolvingInputs,
    hasError: mocks.hasError,
    currentPsbtBase64:
      mocks.request?.psbtsBase64[mocks.request.currentIndex] ?? '',
  }),
}));

vi.mock('../../src/components', async () => {
  const { SignSheetScroll } = await import(
    '../../src/components/SignSheetScroll'
  );
  return {
    SignSheetScroll,
    SignPsbtContent: (props: SignPsbtContentProps) => {
      mocks.psbtContentProps.current = props;
      return <div data-testid="sign-psbt-content" />;
    },
    SignReviewLoadingContent: () => <div data-testid="sign-review-loading" />,
    SignReviewErrorContent: () => <div data-testid="sign-review-error" />,
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

const request: PendingSignPsbtRequest = {
  requestId: 'req-1',
  dappOrigin: dapp.origin,
  dapp,
  psbtsBase64: ['cHNidA=='],
  currentIndex: 0,
  accountId: AccountId('bitcoin-account-0'),
};

describe('BitcoinDappSignTxSheet', () => {
  beforeEach(() => {
    mocks.request = null;
    mocks.isComplete = false;
    mocks.isError = false;
    mocks.isResolvingInputs = false;
    mocks.inspection = undefined;
    mocks.hasError = false;
    mocks.handleConfirm.mockClear();
    mocks.handleReject.mockClear();
    mocks.setOptions.mockClear();
    mocks.dispatched = [];
    mocks.psbtContentProps.current = null;
    mocks.resultContentProps.current = null;
  });

  it('renders the scroll container with the Cardano-matching padding and no scroll indicator', () => {
    render(<BitcoinDappSignTxSheet />);

    const scroll = screen.getByTestId('bitcoin-sign-psbt-sheet-scroll');
    expect(scroll.dataset.showIndicator).toBe('false');
    expect(JSON.parse(scroll.dataset.style ?? '{}')).toEqual({
      flexGrow: 1,
      width: '100%',
      paddingHorizontal: 16,
      paddingBottom: 80,
    });
  });

  it('shows the loading content while the request or its inspection is not ready', () => {
    render(<BitcoinDappSignTxSheet />);

    expect(screen.getByTestId('sign-review-loading')).toBeTruthy();
    expect(screen.queryByTestId('sign-psbt-content')).toBeNull();
  });

  it('shows the PSBT content once the request and its inspection are ready', () => {
    mocks.request = request;
    mocks.inspection = { inputs: [], outputs: [] };

    render(<BitcoinDappSignTxSheet />);

    expect(screen.queryByTestId('sign-review-loading')).toBeNull();
    expect(screen.getByTestId('sign-psbt-content')).toBeTruthy();
    expect(mocks.psbtContentProps.current?.dapp).toEqual(dapp);
    expect(mocks.psbtContentProps.current?.totalCount).toBe(1);
  });

  it('passes the account captured on the request to the PSBT content', () => {
    mocks.request = request;
    mocks.inspection = { inputs: [], outputs: [] };

    render(<BitcoinDappSignTxSheet />);

    expect(mocks.psbtContentProps.current?.accountId).toBe('bitcoin-account-0');
  });

  it('sets the sheet header and footer chrome via navigation.setOptions', () => {
    mocks.request = request;
    mocks.inspection = { inputs: [], outputs: [] };

    render(<BitcoinDappSignTxSheet />);

    const options = mocks.setOptions.mock.calls.at(-1)?.[0] as
      | { header?: unknown; footer?: unknown }
      | undefined;
    expect(options?.header).toBeDefined();
    expect(options?.footer).toBeDefined();
  });

  it('shows the error content and omits the primary button when the PSBT fails to decode', () => {
    mocks.request = request;
    mocks.hasError = true;

    render(<BitcoinDappSignTxSheet />);

    expect(screen.getByTestId('sign-review-error')).toBeTruthy();
    expect(screen.queryByTestId('sign-review-loading')).toBeNull();
    expect(screen.queryByTestId('sign-psbt-content')).toBeNull();

    const options = mocks.setOptions.mock.calls.at(-1)?.[0] as
      | { footer?: { props?: { primaryButton?: unknown } } }
      | undefined;
    expect(options?.footer?.props?.primaryButton).toBeUndefined();
  });

  it('replaces the review content with the success result when signing completes', () => {
    mocks.isComplete = true;

    render(<BitcoinDappSignTxSheet />);

    expect(screen.getByTestId('sign-review-result')).toBeTruthy();
    expect(screen.queryByTestId('bitcoin-sign-psbt-sheet-scroll')).toBeNull();
    expect(mocks.resultContentProps.current?.state).toBe('success');
    expect(mocks.resultContentProps.current?.descriptionKey).toBe(
      'dapp-connector.bitcoin.sign-psbt.result.success.description',
    );
  });

  it('shows the failure result when signing errors', () => {
    mocks.isError = true;

    render(<BitcoinDappSignTxSheet />);

    expect(screen.getByTestId('sign-review-result')).toBeTruthy();
    expect(mocks.resultContentProps.current?.state).toBe('failure');
    expect(mocks.resultContentProps.current?.descriptionKey).toBe(
      'dapp-connector.bitcoin.sign-psbt.result.failure.description',
    );
  });

  it('leaves the navigation options to the result screen while it is showing', () => {
    mocks.isComplete = true;

    render(<BitcoinDappSignTxSheet />);

    expect(mocks.setOptions).not.toHaveBeenCalled();
  });

  it('closes the sheet via setActiveSheetPage(null) from the result Close button', () => {
    mocks.isComplete = true;

    render(<BitcoinDappSignTxSheet />);

    mocks.resultContentProps.current?.onClose();
    expect(mocks.dispatched).toContainEqual({
      key: 'views.setActiveSheetPage',
      payload: null,
    });
  });
});
