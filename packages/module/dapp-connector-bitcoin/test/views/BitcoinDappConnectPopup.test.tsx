/**
 * @vitest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinDappConnectPopup } from '../../src/views/BitcoinDappConnectPopup';

import type { AuthorizeDappContentProps } from '../../src/components/AuthorizeDappContent';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const mocks = vi.hoisted(() => ({
  selectors: {} as Record<string, unknown>,
  dispatched: [] as Array<{ key: string; args: unknown[] }>,
  contentProps: { current: null as AuthorizeDappContentProps | null },
  dispatchers: new Map<string, (...args: unknown[]) => void>(),
}));

vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../src/hooks', () => ({
  useLaceSelector: (key: string) => mocks.selectors[key],
  useDispatchLaceAction: (key: string) => {
    const existing = mocks.dispatchers.get(key);
    if (existing) return existing;
    const dispatcher = (...args: unknown[]) => {
      mocks.dispatched.push({ key, args });
    };
    mocks.dispatchers.set(key, dispatcher);
    return dispatcher;
  },
}));

vi.mock('../../src/components', () => ({
  AuthorizeDappContent: (props: AuthorizeDappContentProps) => {
    mocks.contentProps.current = props;
    return <div data-testid="authorize-content" />;
  },
}));

vi.mock('@lace-lib/ui-extension', () => ({
  DappConnectorLayoutV2: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  Text: {
    S: ({ children }: { children?: React.ReactNode }) => (
      <span>{children}</span>
    ),
  },
  spacing: { M: 12 },
}));

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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

const midnightAccount = {
  accountId: 'midnight-account-0',
  blockchainName: 'Midnight',
  walletId: 'wallet-0',
  metadata: { name: 'Midnight 0' },
} as unknown as AnyAccount;

const setSelectors = (overrides: Record<string, unknown>) => {
  mocks.selectors = {
    'dappConnector.selectActiveAuthorizeDappRequest': { dapp },
    'wallets.selectActiveNetworkAccounts': [bitcoinAccount],
    'wallets.selectActiveNetworkWallets': [
      { walletId: 'wallet-0', metadata: { name: 'Wallet 0' } },
    ],
    ...overrides,
  };
};

describe('BitcoinDappConnectPopup', () => {
  beforeEach(() => {
    mocks.dispatched = [];
    mocks.contentProps.current = null;
    setSelectors({});
    window.close = vi.fn();
  });

  it('passes only Bitcoin accounts to the connect content', () => {
    setSelectors({
      'wallets.selectActiveNetworkAccounts': [bitcoinAccount, midnightAccount],
    });

    render(<BitcoinDappConnectPopup />);

    expect(mocks.contentProps.current?.accounts).toEqual([bitcoinAccount]);
  });

  it('dispatches confirmConnect with the selected account and dappId on authorize', () => {
    render(<BitcoinDappConnectPopup />);

    act(() => {
      mocks.contentProps.current?.onSelectAccount(bitcoinAccount);
    });
    act(() => {
      mocks.contentProps.current?.onAuthorize();
    });

    expect(mocks.dispatched).toContainEqual({
      key: 'bitcoinDappConnector.confirmConnect',
      args: [{ account: bitcoinAccount, dappId: dapp.id }],
    });
  });

  it('does not authorize until an account is picked', () => {
    render(<BitcoinDappConnectPopup />);

    act(() => {
      mocks.contentProps.current?.onAuthorize();
    });

    expect(mocks.dispatched).toEqual([]);
  });

  it('completes unauthorized on cancel', () => {
    render(<BitcoinDappConnectPopup />);

    act(() => {
      mocks.contentProps.current?.onCancel();
    });

    expect(mocks.dispatched).toContainEqual({
      key: 'authorizeDapp.completed',
      args: [{ authorized: false, dapp }],
    });
  });

  it('completes unauthorized on unmount when the user has not resolved', () => {
    const { unmount } = render(<BitcoinDappConnectPopup />);

    unmount();

    expect(mocks.dispatched).toContainEqual({
      key: 'authorizeDapp.completed',
      args: [{ authorized: false, dapp }],
    });
  });

  it('does not complete unauthorized on unmount after authorizing', () => {
    render(<BitcoinDappConnectPopup />);

    act(() => {
      mocks.contentProps.current?.onSelectAccount(bitcoinAccount);
    });
    act(() => {
      mocks.contentProps.current?.onAuthorize();
    });

    expect(
      mocks.dispatched.some(({ key }) => key === 'authorizeDapp.completed'),
    ).toBe(false);
  });

  it('asks the service worker to close the popup when there is no active request', () => {
    setSelectors({ 'dappConnector.selectActiveAuthorizeDappRequest': null });

    render(<BitcoinDappConnectPopup />);

    expect(mocks.dispatched).toContainEqual({
      key: 'bitcoinDappConnector.closePopupRequested',
      args: ['/bitcoin-dapp-connect'],
    });
    expect(window.close).not.toHaveBeenCalled();
  });
});
