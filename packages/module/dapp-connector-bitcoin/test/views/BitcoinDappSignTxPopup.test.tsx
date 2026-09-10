/**
 * @vitest-environment jsdom
 */
import { AccountId } from '@lace-contract/wallet-repo';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinDappSignTxPopup } from '../../src/views/BitcoinDappSignTxPopup';

import type { SignPsbtContentProps } from '../../src/components/SignPsbtContent';
import type { PendingSignPsbtRequest } from '../../src/store/slice';

type LayoutButton = { label: string; action: () => void; disabled?: boolean };

const mocks = vi.hoisted(() => ({
  request: null as PendingSignPsbtRequest | null,
  isResolvingInputs: false,
  inspection: undefined as unknown,
  hasError: false,
  handleConfirm: vi.fn(),
  handleReject: vi.fn(),
  psbtContentProps: { current: null as SignPsbtContentProps | null },
  viewCloseLocation: { current: undefined as string | undefined },
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
  useDappPopupFlow: () => ({
    request: mocks.request,
    handleConfirm: mocks.handleConfirm,
    handleReject: mocks.handleReject,
  }),
  useDappViewClose: (location?: string) => {
    mocks.viewCloseLocation.current = location;
    return vi.fn();
  },
  useDispatchLaceAction: () => vi.fn(),
  useSignPsbtData: () => ({
    inspection: mocks.inspection,
    isResolvingInputs: mocks.isResolvingInputs,
    hasError: mocks.hasError,
    currentPsbtBase64:
      mocks.request?.psbtsBase64[mocks.request.currentIndex] ?? '',
  }),
}));

vi.mock('../../src/components', () => ({
  SignPsbtContent: (props: SignPsbtContentProps) => {
    mocks.psbtContentProps.current = props;
    return <div data-testid="sign-psbt-content" />;
  },
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

const dapp = { name: 'Test DApp', origin: 'https://dapp.example' };

const request: PendingSignPsbtRequest = {
  requestId: 'req-1',
  dappOrigin: dapp.origin,
  dapp,
  psbtsBase64: ['cHNidA=='],
  currentIndex: 0,
  accountId: AccountId('bitcoin-account-0'),
};

describe('BitcoinDappSignTxPopup', () => {
  beforeEach(() => {
    mocks.request = null;
    mocks.isResolvingInputs = false;
    mocks.inspection = undefined;
    mocks.hasError = false;
    mocks.handleConfirm.mockClear();
    mocks.handleReject.mockClear();
    mocks.psbtContentProps.current = null;
    mocks.layoutProps.current = null;
    mocks.viewCloseLocation.current = undefined;
  });

  it('closes through the sign tx popup location instead of window.close', () => {
    render(<BitcoinDappSignTxPopup />);

    expect(mocks.viewCloseLocation.current).toBe('/bitcoin-dapp-sign-tx');
  });

  it('shows the loading content while the request or its inspection is not ready', () => {
    render(<BitcoinDappSignTxPopup />);

    expect(screen.getByTestId('sign-review-loading')).toBeTruthy();
    expect(screen.queryByTestId('sign-psbt-content')).toBeNull();
    expect(mocks.layoutProps.current?.primaryButton?.disabled).toBe(true);
  });

  it('shows the PSBT content once the request and its inspection are ready', () => {
    mocks.request = request;
    mocks.inspection = { inputs: [], outputs: [] };

    render(<BitcoinDappSignTxPopup />);

    expect(screen.queryByTestId('sign-review-loading')).toBeNull();
    expect(screen.getByTestId('sign-psbt-content')).toBeTruthy();
    expect(mocks.psbtContentProps.current?.dapp).toEqual(dapp);
    expect(mocks.psbtContentProps.current?.accountId).toBe('bitcoin-account-0');
  });

  it('shows the error content and omits the primary button when the PSBT fails to decode', () => {
    mocks.request = request;
    mocks.hasError = true;

    render(<BitcoinDappSignTxPopup />);

    expect(screen.getByTestId('sign-review-error')).toBeTruthy();
    expect(screen.queryByTestId('sign-review-loading')).toBeNull();
    expect(screen.queryByTestId('sign-psbt-content')).toBeNull();
    expect(mocks.layoutProps.current?.primaryButton).toBeUndefined();
    expect(mocks.layoutProps.current?.secondaryButton).toBeDefined();
  });
});
