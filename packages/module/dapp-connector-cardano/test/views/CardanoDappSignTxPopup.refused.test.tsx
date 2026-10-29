/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardanoDappSignTxPopup } from '../../src/browser/views/CardanoDappSignTxPopup';
import { SIGN_TX_REFUSED_KEYS } from '../../src/common/components/sign-tx-refused-keys';

import type { PendingSignTxRequest } from '../../src/common/store/slice';

/**
 * The refused state in POPUP-WINDOW mode (`CardanoDappSignTxPopup` ->
 * `DappConnectorLayoutV2`).
 *
 * MECHANISM: the house convention mocks
 * `@lace-lib/ui-extension` (`BitcoinDappSignTxPopup.test.tsx`),
 * so NO testID ever reaches the DOM and a `queryByTestId(...)` absence
 * assertion would be vacuously green in either mode. This file therefore
 * asserts the PROPS this mode's own component passes to its layout --
 * `primaryButton` undefined, `secondaryButton` present -- which is the
 * decision the mode's render code actually makes. The sheet mode has
 * SEPARATE render code and its own file
 * (`CardanoDappSignTx.refused.test.tsx`); neither test covers the other.
 *
 * `t` is the key-echo mock, so every asserted string IS the i18n key: a
 * hardcoded English sentence in the component would red these tests.
 */

type LayoutButton = { label: string; action: () => void; disabled?: boolean };

const mocks = vi.hoisted(() => ({
  request: null as PendingSignTxRequest | null,
  transactionError: undefined as unknown,
  transactionInfo: undefined as unknown,
  signingError: undefined as unknown,
  isError: false,
  errorProps: undefined as unknown,
  signTxDataArgs: { current: null as { txHex: string } | null },
  layoutProps: {
    current: null as {
      primaryButton?: LayoutButton;
      secondaryButton?: LayoutButton;
    } | null,
  },
}));

vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<object>()),
  // Key-echo, plus the interpolation values when there are any: a network
  // sentence that reached the screen without its wallet network is then a
  // different string from one that did.
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values ? `${key}:${Object.values(values).join(',')}` : key,
  }),
}));

vi.mock('../../src/browser/hooks', () => ({
  useDappPopupFlow: () => ({
    request: mocks.request,
    handleConfirm: vi.fn(),
    handleReject: vi.fn(),
    isLoading: !mocks.request,
    isComplete: false,
    isError: mocks.isError,
  }),
  useDappViewClose: () => vi.fn(),
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

vi.mock('../../src/common/hooks', () => ({
  useLaceSelector: () => mocks.signingError,
}));

vi.mock('../../src/common/components', () => ({
  SignTxContent: () => <div data-testid="sign-tx-content" />,
  SignTxError: ({ error }: { error?: unknown }) => {
    mocks.errorProps = error;
    return (
      <div data-testid="sign-tx-error">
        dapp-connector.cardano.sign-tx.error-try-again
      </div>
    );
  },
  SignTxLoadingContent: () => <div data-testid="sign-tx-loading" />,
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
  Column: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
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
}));

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

/**
 * Attacker-supplied values that shape A forbids on this screen. Deliberately
 * carried on the pending request (the real flow does too) so the assertion
 * proves the SCREEN drops them, not that the fixture lacks them.
 */
const ATTACKER_ADDRESS =
  'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl';
const ATTACKER_TX_HEX = `84a4008182582${ATTACKER_ADDRESS}`;

const DAPP_ORIGIN = 'https://evil-dex.example';

const COLLATERAL_REFUSAL: PendingSignTxRequest['refusal'] = {
  kind: 'collateral',
  case: 'foreign-collateral-return',
};

const NETWORK_REFUSAL: PendingSignTxRequest['refusal'] = {
  kind: 'network',
  cause: 'states-other-network',
  statedNetwork: 'mainnet',
  walletNetwork: 'preprod',
};

const pendingRequest = (
  refusal: PendingSignTxRequest['refusal'],
  origin: string = DAPP_ORIGIN,
): PendingSignTxRequest => ({
  requestId: 'req-1',
  dappOrigin: origin,
  dapp: { name: 'Evil DEX', origin },
  txHex: ATTACKER_TX_HEX,
  partialSign: true,
  refusal,
});

beforeEach(() => {
  mocks.request = null;
  mocks.transactionError = undefined;
  mocks.transactionInfo = undefined;
  mocks.signingError = undefined;
  mocks.isError = false;
  mocks.errorProps = undefined;
  mocks.layoutProps.current = null;
  mocks.signTxDataArgs.current = null;
});

it('shows the propagated signer error after the request clears, not the empty-transaction error', () => {
  mocks.isError = true;
  mocks.transactionError = 'No transaction data provided';
  mocks.signingError = {
    stage: 'signer setup',
    name: 'Error',
    message: 'No signer factory registered for account type [redacted]',
  };
  render(<CardanoDappSignTxPopup />);
  expect(mocks.errorProps).toEqual(mocks.signingError);
});

describe('the refused state renders (popup-window mode)', () => {
  it('a cross-network body renders the network sentence, naming the wallet network, and still offers no signing action', () => {
    mocks.request = pendingRequest(NETWORK_REFUSAL);

    render(<CardanoDappSignTxPopup />);

    expect(screen.getByText(SIGN_TX_REFUSED_KEYS.title)).toBeTruthy();
    // The stated side picks the KEY; the wallet side is interpolated. Both
    // halves are asserted, because a sentence naming only one of them cannot
    // tell the user which way the mismatch runs.
    expect(
      screen.getByText(
        `${SIGN_TX_REFUSED_KEYS.description['network-mainnet']}:preprod`,
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(
        SIGN_TX_REFUSED_KEYS.description['foreign-collateral-return'],
      ),
    ).toBeNull();

    expect(screen.getByText(DAPP_ORIGIN)).toBeTruthy();
    expect(mocks.layoutProps.current?.primaryButton).toBeUndefined();
    expect(mocks.layoutProps.current?.secondaryButton).toBeDefined();
    expect(mocks.signTxDataArgs.current?.txHex).toBe('');
  });

  it('case (b) foreign collateral return: renders title + body + reassurance from the i18n keys, with no signing action and exactly one dismiss action', () => {
    mocks.request = pendingRequest(COLLATERAL_REFUSAL);

    render(<CardanoDappSignTxPopup />);

    // Copy: every rendered string resolves through `t(key)`.
    expect(screen.getByText(SIGN_TX_REFUSED_KEYS.title)).toBeTruthy();
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

    // Affordances, asserted where this mode actually decides them.
    expect(mocks.layoutProps.current?.primaryButton).toBeUndefined();
    expect(mocks.layoutProps.current?.secondaryButton).toBeDefined();
    expect(mocks.layoutProps.current?.secondaryButton?.label).toBe(
      'dapp-connector.cardano.sign-tx.result.close',
    );

    // Neither the review content nor the loading state co-renders.
    expect(screen.queryByTestId('sign-tx-content')).toBeNull();
    expect(screen.queryByTestId('sign-tx-loading')).toBeNull();
  });

  it('renders the review screen WITH its signing action when there is no block verdict (allow path untouched)', () => {
    mocks.request = pendingRequest(null);
    mocks.transactionInfo = { fee: 170_000n };

    render(<CardanoDappSignTxPopup />);

    expect(mocks.layoutProps.current?.primaryButton).toBeDefined();
    expect(mocks.layoutProps.current?.primaryButton?.label).toBe(
      'dapp-connector.cardano.sign-tx.confirm',
    );
    expect(mocks.layoutProps.current?.secondaryButton?.label).toBe(
      'dapp-connector.cardano.sign-tx.cancel',
    );
    expect(screen.getByTestId('sign-tx-content')).toBeTruthy();
    expect(screen.queryByText(SIGN_TX_REFUSED_KEYS.title)).toBeNull();
  });
});

describe('refused is distinct from error (popup-window mode)', () => {
  it('a technical error with NO block verdict still renders the generic error copy and no refusal copy', () => {
    mocks.request = pendingRequest(null);
    mocks.transactionError = new Error('decode failed');

    render(<CardanoDappSignTxPopup />);

    expect(screen.getByTestId('sign-tx-error')).toBeTruthy();
    expect(
      screen.getByText('dapp-connector.cardano.sign-tx.error-title'),
    ).toBeTruthy();
    expect(screen.queryByText(SIGN_TX_REFUSED_KEYS.title)).toBeNull();
    expect(
      screen.queryByText(
        SIGN_TX_REFUSED_KEYS.description['foreign-collateral-return'],
      ),
    ).toBeNull();
    expect(mocks.layoutProps.current?.primaryButton).toBeUndefined();
  });

  it('a block verdict renders the refusal copy and NOT the generic error copy, even when a transaction error is also present', () => {
    mocks.request = pendingRequest(COLLATERAL_REFUSAL);
    mocks.transactionError = new Error('decode failed');

    render(<CardanoDappSignTxPopup />);

    expect(screen.getByText(SIGN_TX_REFUSED_KEYS.title)).toBeTruthy();
    expect(screen.queryByTestId('sign-tx-error')).toBeNull();
    expect(
      screen.queryByText('dapp-connector.cardano.sign-tx.error-title'),
    ).toBeNull();
  });
});

describe('no attacker-supplied values are rendered (popup-window mode)', () => {
  it('renders no transaction-derived value, and does not even feed the tx to the data hook', () => {
    mocks.request = pendingRequest(COLLATERAL_REFUSAL);

    const { container } = render(<CardanoDappSignTxPopup />);

    expect(container.textContent).not.toContain(ATTACKER_ADDRESS);
    expect(container.textContent).not.toContain(ATTACKER_TX_HEX);
    // Shape A goes one step further than "not rendered": the hostile CBOR is
    // not inspected, resolved or priced either.
    expect(mocks.signTxDataArgs.current?.txHex).toBe('');
  });
});

describe('the refused state names the requesting origin (popup-window mode)', () => {
  it('renders the requesting origin, equal to the origin on the pending request', () => {
    mocks.request = pendingRequest(COLLATERAL_REFUSAL);

    render(<CardanoDappSignTxPopup />);

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
    mocks.request = pendingRequest(COLLATERAL_REFUSAL, HOSTILE);

    const { container } = render(<CardanoDappSignTxPopup />);

    expect(screen.getByText(HOSTILE)).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(container.innerHTML).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
