/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../../../src/hooks';
import { useOwnAccountsAsContacts } from '../../../src/pages/AddressBook/useOwnAccountsAsContacts';

import type { AccountId } from '@lace-contract/wallet-repo';

vi.mock('../../../src/hooks', () => ({
  useLaceSelector: vi.fn(),
}));

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const SELF_KEY = 'v2.sheets.address-book.self-indicator';

const makeWallet = (walletId: string, name: string) => ({
  walletId,
  metadata: { name, order: 0 },
});

const makeAccount = ({
  accountId,
  walletId,
  accountName,
  blockchainName = 'Cardano',
  avatarUri,
}: {
  accountId: string;
  walletId: string;
  accountName: string;
  blockchainName?: string;
  avatarUri?: string;
}) => ({
  accountId: accountId as AccountId,
  walletId,
  blockchainName,
  metadata: { name: accountName, avatarUri },
});

const makeAddress = (
  address: string,
  accountId: string,
  blockchainName = 'Cardano',
) => ({
  address,
  blockchainName,
  accountId: accountId as AccountId,
  name: undefined,
});

describe('useOwnAccountsAsContacts', () => {
  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);

  const setup = (
    accounts: ReturnType<typeof makeAccount>[],
    wallets: ReturnType<typeof makeWallet>[],
    addresses: ReturnType<typeof makeAddress>[],
  ) => {
    mockUseLaceSelector.mockImplementation((key: string) => {
      switch (key) {
        case 'wallets.selectActiveNetworkAccounts':
          return accounts;
        case 'wallets.selectAll':
          return wallets;
        case 'addresses.selectActiveNetworkAccountAddresses':
          return addresses;
        default:
          return undefined;
      }
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when blockchainName is undefined', () => {
    setup([], [], []);
    const { result } = renderHook(() =>
      useOwnAccountsAsContacts('acc-1' as AccountId, undefined),
    );
    expect(result.current).toEqual([]);
  });

  it('filters accounts to those matching the given blockchain', () => {
    setup(
      [
        makeAccount({
          accountId: 'acc-1',
          walletId: 'w-1',
          accountName: 'Account 1',
          blockchainName: 'Cardano',
        }),
        makeAccount({
          accountId: 'acc-2',
          walletId: 'w-1',
          accountName: 'Account 2',
          blockchainName: 'Bitcoin',
        }),
      ],
      [makeWallet('w-1', 'My Wallet')],
      [
        makeAddress('addr-1', 'acc-1', 'Cardano'),
        makeAddress('btc-1', 'acc-2', 'Bitcoin'),
      ],
    );
    const { result } = renderHook(() =>
      useOwnAccountsAsContacts('other' as AccountId, 'Cardano'),
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('acc-1');
  });

  it('uses account name only when there is one wallet', () => {
    setup(
      [
        makeAccount({
          accountId: 'acc-1',
          walletId: 'w-1',
          accountName: 'My Account',
        }),
      ],
      [makeWallet('w-1', 'My Wallet')],
      [makeAddress('addr-1', 'acc-1')],
    );
    const { result } = renderHook(() =>
      useOwnAccountsAsContacts('other' as AccountId, 'Cardano'),
    );
    expect(result.current[0].name).toBe('My Account');
  });

  it('uses "Wallet · Account" name when there are multiple wallets', () => {
    setup(
      [
        makeAccount({
          accountId: 'acc-1',
          walletId: 'w-1',
          accountName: 'Account 1',
        }),
        makeAccount({
          accountId: 'acc-2',
          walletId: 'w-2',
          accountName: 'Account 1',
        }),
      ],
      [makeWallet('w-1', 'Wallet A'), makeWallet('w-2', 'Wallet B')],
      [makeAddress('addr-1', 'acc-1'), makeAddress('addr-2', 'acc-2')],
    );
    const { result } = renderHook(() =>
      useOwnAccountsAsContacts('other' as AccountId, 'Cardano'),
    );
    expect(result.current[0].name).toBe('Wallet A · Account 1');
    expect(result.current[1].name).toBe('Wallet B · Account 1');
  });

  it('appends the self indicator to the source account name', () => {
    setup(
      [
        makeAccount({
          accountId: 'acc-1',
          walletId: 'w-1',
          accountName: 'My Account',
        }),
      ],
      [makeWallet('w-1', 'My Wallet')],
      [makeAddress('addr-1', 'acc-1')],
    );
    const { result } = renderHook(() =>
      useOwnAccountsAsContacts('acc-1' as AccountId, 'Cardano'),
    );
    expect(result.current[0].name).toBe(`My Account ${SELF_KEY}`);
  });

  it('appends self indicator using wallet+account format when multiple wallets', () => {
    setup(
      [
        makeAccount({
          accountId: 'acc-1',
          walletId: 'w-1',
          accountName: 'Account 1',
        }),
        makeAccount({
          accountId: 'acc-2',
          walletId: 'w-2',
          accountName: 'Account 1',
        }),
      ],
      [makeWallet('w-1', 'Wallet A'), makeWallet('w-2', 'Wallet B')],
      [makeAddress('addr-1', 'acc-1'), makeAddress('addr-2', 'acc-2')],
    );
    const { result } = renderHook(() =>
      useOwnAccountsAsContacts('acc-1' as AccountId, 'Cardano'),
    );
    expect(result.current[0].name).toBe(`Wallet A · Account 1 ${SELF_KEY}`);
    expect(result.current[1].name).toBe('Wallet B · Account 1');
  });

  it('excludes accounts that have no addresses in the store', () => {
    setup(
      [
        makeAccount({
          accountId: 'acc-1',
          walletId: 'w-1',
          accountName: 'Account 1',
        }),
      ],
      [makeWallet('w-1', 'My Wallet')],
      [],
    );
    const { result } = renderHook(() =>
      useOwnAccountsAsContacts('other' as AccountId, 'Cardano'),
    );
    expect(result.current).toEqual([]);
  });

  it('includes all addresses for an account', () => {
    setup(
      [
        makeAccount({
          accountId: 'acc-1',
          walletId: 'w-1',
          accountName: 'Account 1',
        }),
      ],
      [makeWallet('w-1', 'My Wallet')],
      [makeAddress('addr-1', 'acc-1'), makeAddress('addr-2', 'acc-1')],
    );
    const { result } = renderHook(() =>
      useOwnAccountsAsContacts('other' as AccountId, 'Cardano'),
    );
    expect(result.current[0].addresses).toHaveLength(2);
  });

  it('maps account avatarUri to ContactItem avatar', () => {
    setup(
      [
        makeAccount({
          accountId: 'acc-1',
          walletId: 'w-1',
          accountName: 'Account 1',
          blockchainName: 'Cardano',
          avatarUri: 'avatar-url',
        }),
      ],
      [makeWallet('w-1', 'My Wallet')],
      [makeAddress('addr-1', 'acc-1')],
    );
    const { result } = renderHook(() =>
      useOwnAccountsAsContacts('other' as AccountId, 'Cardano'),
    );
    expect(result.current[0].avatar).toBe('avatar-url');
  });

  it('returns empty array when there are no active-network accounts', () => {
    setup([], [makeWallet('w-1', 'My Wallet')], []);
    const { result } = renderHook(() =>
      useOwnAccountsAsContacts('acc-1' as AccountId, 'Cardano'),
    );
    expect(result.current).toEqual([]);
  });
});
