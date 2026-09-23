/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardanoDappSignTx } from '../../src/browser/views/CardanoDappSignTx';
import { SIGN_TX_REFUSED_KEYS } from '../../src/common/components/sign-tx-refused-keys';

import type { PendingSignTxRequest } from '../../src/common/store/slice';

/**
 * The refused state in SHEET mode (`CardanoDappSignTx` -> `SignTxLayout` ->
 * `Sheet.Footer`).
 *
 * The sheet mode has render code of its own -- the popup-window test cannot
 * cover it -- and its layout is `SignTxLayout`, not `DappConnectorLayoutV2`.
 * The REAL `SignTxLayout` is kept in the tree here (only its heavy siblings
 * are stubbed) so the assertion lands on the actual `primaryButton` /
 * `secondaryButton` props this mode produces, captured off the
 * `navigation.setOptions` footer element -- the props are the affordance,
 * and no testID survives the house's component mocking.
 *
 * The same shared `SignTxRefused` renders here as in the popup -- one
 * component, no per-mode variant.
 */

type FooterButton = { label: string; testID?: string; disabled?: boolean };

const mocks = vi.hoisted(() => ({
  request: null as PendingSignTxRequest | null,
  transactionError: undefined as unknown,
  transactionInfo: undefined as unknown,
  signTxDataArgs: { current: null as { txHex: string } | null },
  navOptions: {
    current: null as {
      header?: React.ReactElement<{ title?: string }>;
      footer?: React.ReactElement<{
        primaryButton?: FooterButton;
        secondaryButton?: FooterButton;
      }>;
    } | null,
  },
}));

vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    setOptions: (options: unknown) => {
      mocks.navOptions.current = options as typeof mocks.navOptions.current;
    },
  }),
}));

vi.mock('../../src/browser/hooks', () => ({
  useDappPopupFlow: () => ({
    request: mocks.request,
    handleConfirm: vi.fn(),
    handleReject: vi.fn(),
    isLoading: !mocks.request,
    isComplete: false,
    isError: false,
  }),
  useDappViewClose: () => vi.fn(),
}));

vi.mock('../../src/common/hooks', () => ({
  useLaceSelector: (selector: string) => {
    if (selector === 'wallets.selectAll') return [];
    if (selector === 'cardanoDappConnector.selectSessionAccountByOrigin')
      return {};
    return undefined;
  },
}));

vi.mock('../../src/common/hooks/useSignTxData', () => ({
  useSignTxData: (args: { txHex: string }) => {
    mocks.signTxDataArgs.current = args;
    return {
      transactionInfo: mocks.transactionInfo,
      transactionError: mocks.transactionError,
      isResolvingInputs: false,
      isLoadingCollateral: false,
    };
  },
}));

// The REAL layout, so this mode's own footer decision is exercised; only the
// content components it would otherwise pull in are stubbed.
vi.mock('../../src/common/components', async () => {
  const { SignTxLayout } = await import(
    '../../src/common/components/SignTxLayout'
  );
  return {
    SignTxLayout,
    SignTxResult: () => <div data-testid="sign-tx-result" />,
  };
});

vi.mock('../../src/common/components/SignTxContent', () => ({
  SignTxContent: () => <div data-testid="sign-tx-content" />,
}));

vi.mock('../../src/common/components/SignTxLoadingContent', () => ({
  SignTxLoadingContent: () => <div data-testid="sign-tx-loading" />,
}));

vi.mock('../../src/common/components/SignTxView', () => ({
  SignTxView: ({
    resultView,
    scrollContent,
  }: {
    resultView: React.ReactNode;
    scrollContent: React.ReactNode;
  }) => <div>{resultView ?? scrollContent}</div>,
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  Column: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  Sheet: {
    Header: ({ title }: { title?: string }) => <div>{title}</div>,
    Footer: () => <div />,
  },
  Text: {
    S: ({ children }: { children?: React.ReactNode }) => (
      <span>{children}</span>
    ),
    M: ({ children }: { children?: React.ReactNode }) => (
      <span>{children}</span>
    ),
    XS: ({ children }: { children?: React.ReactNode }) => (
      <span>{children}</span>
    ),
  },
  spacing: { L: 16, M: 12, S: 8 },
  useTheme: () => ({ theme: { brand: { white: '#ffffff' } } }),
}));

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

const ATTACKER_ADDRESS =
  'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl';
const ATTACKER_TX_HEX = `84a4008182582${ATTACKER_ADDRESS}`;

const DAPP_ORIGIN = 'https://evil-dex.example';

const pendingRequest = (
  collateralRefusal: PendingSignTxRequest['collateralRefusal'],
  origin: string = DAPP_ORIGIN,
): PendingSignTxRequest => ({
  requestId: 'req-1',
  dappOrigin: origin,
  dapp: { name: 'Evil DEX', origin },
  txHex: ATTACKER_TX_HEX,
  partialSign: true,
  collateralRefusal,
});

const footerProps = () => mocks.navOptions.current?.footer?.props;
const headerTitle = () => mocks.navOptions.current?.header?.props.title;

beforeEach(() => {
  mocks.request = null;
  mocks.transactionError = undefined;
  mocks.transactionInfo = undefined;
  mocks.navOptions.current = null;
  mocks.signTxDataArgs.current = null;
});

describe('the refused state renders (sheet mode)', () => {
  it('case (b) foreign collateral return: renders title + body + reassurance from the i18n keys, with no signing action and exactly one dismiss action', () => {
    mocks.request = pendingRequest('foreign-collateral-return');

    render(<CardanoDappSignTx />);

    expect(headerTitle()).toBe(SIGN_TX_REFUSED_KEYS.title);
    expect(
      screen.getByText(
        SIGN_TX_REFUSED_KEYS.description['foreign-collateral-return'],
      ),
    ).toBeTruthy();
    expect(screen.getByText(SIGN_TX_REFUSED_KEYS.reassurance)).toBeTruthy();

    // The screen NAMES the site that asked. The value is the request's own
    // origin; the label reuses the surface's existing key.
    expect(screen.getByText(SIGN_TX_REFUSED_KEYS.originLabel)).toBeTruthy();
    expect(screen.getByText(DAPP_ORIGIN)).toBeTruthy();

    expect(footerProps()?.primaryButton).toBeUndefined();
    expect(footerProps()?.secondaryButton).toBeDefined();
    expect(footerProps()?.secondaryButton?.label).toBe(
      'dapp-connector.cardano.sign-tx.result.close',
    );
    expect(footerProps()?.secondaryButton?.testID).toBe(
      'dapp-sign-tx-reject-button',
    );

    expect(screen.queryByTestId('sign-tx-content')).toBeNull();
    expect(screen.queryByTestId('sign-tx-loading')).toBeNull();
  });

  it('renders the review screen WITH its signing action when there is no block verdict (allow path untouched)', () => {
    mocks.request = pendingRequest(null);
    mocks.transactionInfo = { fee: 170_000n };

    render(<CardanoDappSignTx />);

    expect(headerTitle()).toBe('dapp-connector.cardano.sign-tx.title');
    expect(footerProps()?.primaryButton).toBeDefined();
    expect(footerProps()?.primaryButton?.testID).toBe(
      'dapp-sign-tx-confirm-button',
    );
    expect(footerProps()?.primaryButton?.disabled).toBe(false);
    expect(footerProps()?.secondaryButton?.label).toBe(
      'dapp-connector.cardano.sign-tx.cancel',
    );
    expect(screen.getByTestId('sign-tx-content')).toBeTruthy();
  });
});

describe('refused is distinct from error (sheet mode)', () => {
  it('a technical error with NO block verdict still renders the generic error copy and no refusal copy', () => {
    mocks.request = pendingRequest(null);
    mocks.transactionError = new Error('decode failed');

    render(<CardanoDappSignTx />);

    expect(headerTitle()).toBe('dapp-connector.cardano.sign-tx.error-title');
    expect(
      screen.getByText('dapp-connector.cardano.sign-tx.error-try-again'),
    ).toBeTruthy();
    expect(
      screen.queryByText(
        SIGN_TX_REFUSED_KEYS.description['foreign-collateral-return'],
      ),
    ).toBeNull();
    expect(footerProps()?.primaryButton).toBeUndefined();
  });

  it('a block verdict renders the refusal copy and NOT the generic error copy, even when a transaction error is also present', () => {
    mocks.request = pendingRequest('foreign-collateral-return');
    mocks.transactionError = new Error('decode failed');

    render(<CardanoDappSignTx />);

    expect(headerTitle()).toBe(SIGN_TX_REFUSED_KEYS.title);
    expect(
      screen.getByText(
        SIGN_TX_REFUSED_KEYS.description['foreign-collateral-return'],
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText('dapp-connector.cardano.sign-tx.error-try-again'),
    ).toBeNull();
  });
});

describe('no attacker-supplied values are rendered (sheet mode)', () => {
  it('renders no transaction-derived value, and does not even feed the tx to the data hook', () => {
    mocks.request = pendingRequest('foreign-collateral-return');

    const { container } = render(<CardanoDappSignTx />);

    expect(container.textContent).not.toContain(ATTACKER_ADDRESS);
    expect(container.textContent).not.toContain(ATTACKER_TX_HEX);
    expect(mocks.signTxDataArgs.current?.txHex).toBe('');
  });
});

describe('the refused state names the requesting origin (sheet mode)', () => {
  it('renders the requesting origin, equal to the origin on the pending request', () => {
    mocks.request = pendingRequest('foreign-collateral-return');

    render(<CardanoDappSignTx />);

    expect(screen.getByText(SIGN_TX_REFUSED_KEYS.originLabel)).toBeTruthy();
    const origin = screen.getByText(DAPP_ORIGIN);
    expect(origin).toBeTruthy();
    expect(origin.textContent).toBe(mocks.request.dapp.origin);
  });

  it('renders a hostile origin as literal TEXT -- no markup interpretation, no link', () => {
    // The one attacker-influenced string on this screen. React never treats a
    // string child as markup, and nothing here renders it as HTML or as a
    // URL, so a spoofing attempt can only ever appear as characters.
    const HOSTILE = '<img src=x onerror=alert(1)>lace.io';
    mocks.request = pendingRequest('foreign-collateral-return', HOSTILE);

    const { container } = render(<CardanoDappSignTx />);

    expect(screen.getByText(HOSTILE)).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(container.innerHTML).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
