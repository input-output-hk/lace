/**
 * @vitest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinDappConnectSheet } from '../../src/views/BitcoinDappConnectSheet';

import type { AuthorizeDappBodyProps } from '../../src/components/AuthorizeDappContent';
import type { AnyAccount } from '@lace-contract/wallet-repo';

type SheetHeaderProps = { title: string; handleClose?: () => void };
type SheetFooterProps = {
  primaryButton?: { label: string; onPress: () => void; disabled?: boolean };
  secondaryButton?: { label: string; onPress: () => void };
};
type SetOptionsCall = {
  header?: React.ReactElement<SheetHeaderProps>;
  footer?: React.ReactElement<SheetFooterProps>;
};

const mocks = vi.hoisted(() => {
  const setOptions = vi.fn();
  return {
    translate: (key: string) => key,
    selectors: {} as Record<string, unknown>,
    dispatched: [] as Array<{ key: string; args: unknown[] }>,
    dispatchers: new Map<string, (...args: unknown[]) => void>(),
    setOptions,
    navigation: { setOptions },
    bodyProps: { current: null as AuthorizeDappBodyProps | null },
  };
});

// A stable `t` and `navigation`, as the real hooks return: unstable ones would
// republish the header on every render and hide what the ADR 31 assertions
// below check.
vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<object>()),
  useTranslation: () => ({ t: mocks.translate }),
}));

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => mocks.navigation,
}));

vi.mock('../../src/hooks', () => ({
  useLaceSelector: (key: string) => mocks.selectors[key],
  useDispatchLaceAction: (key: string, ignoreArgs = false) => {
    const existing = mocks.dispatchers.get(key);
    if (existing) return existing;
    const dispatcher = (...args: unknown[]) => {
      mocks.dispatched.push({ key, args: ignoreArgs ? [] : args });
    };
    mocks.dispatchers.set(key, dispatcher);
    return dispatcher;
  },
}));

vi.mock('../../src/components', () => ({
  AuthorizeDappBody: (props: AuthorizeDappBodyProps) => {
    mocks.bodyProps.current = props;
    return <div data-testid="authorize-body" />;
  },
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  Sheet: {
    Header: () => null,
    Footer: () => null,
  },
  spacing: { M: 16, S: 8 },
  useTheme: () => ({ theme: { brand: { white: '#fff' } } }),
}));

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  ScrollView: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const dapp = {
  id: 'dappId',
  name: 'Test DApp',
  origin: 'https://dapp.example',
  imageUrl: 'https://dapp.example/icon.png',
};

const bitcoinAccount = {
  accountId: 'bitcoin-account-0',
  blockchainName: 'Bitcoin',
  walletId: 'wallet-0',
  metadata: { name: 'Bitcoin 0' },
} as unknown as AnyAccount;

const setSelectors = (overrides: Record<string, unknown> = {}) => {
  mocks.selectors = {
    'dappConnector.selectActiveAuthorizeDappRequest': { dapp },
    'wallets.selectActiveNetworkAccounts': [bitcoinAccount],
    'wallets.selectActiveNetworkWallets': [
      { walletId: 'wallet-0', metadata: { name: 'Wallet 0' } },
    ],
    ...overrides,
  };
};

const setOptionsCalls = (): SetOptionsCall[] =>
  mocks.setOptions.mock.calls.map(([options]) => options as SetOptionsCall);

const headerCalls = () =>
  setOptionsCalls().filter(options => 'header' in options);

const footerCalls = () =>
  setOptionsCalls().filter(options => 'footer' in options);

describe('BitcoinDappConnectSheet', () => {
  beforeEach(() => {
    mocks.dispatched = [];
    mocks.dispatchers.clear();
    mocks.setOptions.mockClear();
    mocks.bodyProps.current = null;
    setSelectors();
  });

  it('publishes the header and the footer in separate setOptions calls', () => {
    render(<BitcoinDappConnectSheet />);

    expect(headerCalls()).toHaveLength(1);
    expect(footerCalls()).toHaveLength(1);
    expect(headerCalls()[0]?.footer).toBeUndefined();
    expect(footerCalls()[0]?.header).toBeUndefined();
  });

  it('republishes only the footer when an account is selected', () => {
    render(<BitcoinDappConnectSheet />);
    const publishedHeader = headerCalls()[0]?.header;

    act(() => {
      mocks.bodyProps.current?.onSelectAccount(bitcoinAccount);
    });

    expect(headerCalls()).toHaveLength(1);
    expect(headerCalls()[0]?.header).toBe(publishedHeader);
    expect(footerCalls().length).toBeGreaterThan(1);
    expect(footerCalls().at(-1)?.footer?.props.primaryButton?.disabled).toBe(
      false,
    );
  });

  it('rejects the connection from the header close button', () => {
    render(<BitcoinDappConnectSheet />);

    act(() => {
      headerCalls()[0]?.header?.props.handleClose?.();
    });

    expect(mocks.dispatched).toEqual([
      { key: 'bitcoinDappConnector.rejectConnect', args: [] },
    ]);
  });

  it('rejects the connection from the footer cancel button', () => {
    render(<BitcoinDappConnectSheet />);

    act(() => {
      footerCalls().at(-1)?.footer?.props.secondaryButton?.onPress();
    });

    expect(mocks.dispatched).toEqual([
      { key: 'bitcoinDappConnector.rejectConnect', args: [] },
    ]);
  });

  it('rejects the connection when the sheet is dismissed without a response', () => {
    const { unmount } = render(<BitcoinDappConnectSheet />);

    unmount();

    expect(mocks.dispatched).toEqual([
      { key: 'bitcoinDappConnector.rejectConnect', args: [] },
    ]);
  });

  it('does not reject on dismissal after the user authorized', () => {
    render(<BitcoinDappConnectSheet />);

    act(() => {
      mocks.bodyProps.current?.onSelectAccount(bitcoinAccount);
    });
    act(() => {
      footerCalls().at(-1)?.footer?.props.primaryButton?.onPress();
    });

    expect(mocks.dispatched).toEqual([
      {
        key: 'bitcoinDappConnector.confirmConnect',
        args: [{ account: bitcoinAccount, dappId: dapp.id }],
      },
    ]);
  });

  it('does not reject twice when the sheet unmounts after a rejection', () => {
    const { unmount } = render(<BitcoinDappConnectSheet />);

    act(() => {
      headerCalls()[0]?.header?.props.handleClose?.();
    });
    mocks.dispatched = [];
    unmount();

    expect(mocks.dispatched).toEqual([]);
  });

  it('passes only Bitcoin accounts to the review body', () => {
    setSelectors({
      'wallets.selectActiveNetworkAccounts': [
        bitcoinAccount,
        {
          accountId: 'midnight-account-0',
          blockchainName: 'Midnight',
          walletId: 'wallet-0',
          metadata: { name: 'Midnight 0' },
        } as unknown as AnyAccount,
      ],
    });

    render(<BitcoinDappConnectSheet />);

    expect(mocks.bodyProps.current?.accounts).toEqual([bitcoinAccount]);
  });
});
