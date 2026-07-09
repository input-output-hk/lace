/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../../../src/hooks';
import { useAddressBook } from '../../../src/pages/AddressBook/useAddressBook';

import type { AccountId } from '@lace-contract/wallet-repo';
import type { ContactItem } from '@lace-lib/ui-toolkit';

const mockNavigate = vi.fn();

vi.mock('../../../src/hooks', () => ({
  useLaceSelector: vi.fn(),
}));

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../src/hooks/useSendFlowNavigation', () => ({
  useSendFlowNavigation: () => ({ navigate: mockNavigate }),
}));

vi.mock('@lace-lib/navigation', () => ({
  SheetRoutes: {
    Send: 'Send',
    AddressBook: 'AddressBook',
  },
}));

const mockOwnAccounts: ContactItem[] = [
  {
    id: 'acc-1',
    name: 'My Account (self)',
    addresses: [{ address: 'addr-own-1', blockchainName: 'Cardano' }],
  },
];

vi.mock('../../../src/pages/AddressBook/useOwnAccountsAsContacts', () => ({
  useOwnAccountsAsContacts: vi.fn(() => mockOwnAccounts),
}));

describe('useAddressBook', () => {
  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseLaceSelector.mockImplementation((key: string) => {
      switch (key) {
        case 'wallets.selectActiveNetworkAccounts':
          return [
            {
              accountId: 'acc-1' as AccountId,
              blockchainName: 'Cardano',
            },
          ];
        case 'addressBook.selectAllContacts':
          return [];
        default:
          return undefined;
      }
    });
  });

  it('returns ownAccounts from useOwnAccountsAsContacts', () => {
    const { result } = renderHook(() => useAddressBook('acc-1' as AccountId));
    expect(result.current.ownAccounts).toEqual(mockOwnAccounts);
  });

  it('returns contacts filtered by blockchain', () => {
    mockUseLaceSelector.mockImplementation((key: string) => {
      switch (key) {
        case 'wallets.selectActiveNetworkAccounts':
          return [
            { accountId: 'acc-1' as AccountId, blockchainName: 'Cardano' },
          ];
        case 'addressBook.selectAllContacts':
          return [
            {
              id: 'c-1',
              name: 'Alice',
              aliases: [],
              addresses: [{ blockchainName: 'Cardano', address: 'addr-alice' }],
            },
          ];
        default:
          return undefined;
      }
    });

    const { result } = renderHook(() => useAddressBook('acc-1' as AccountId));

    expect(result.current.contacts).toHaveLength(1);
    expect(result.current.contacts[0].name).toBe('Alice');
  });

  it('returns section labels in the labels object', () => {
    const { result } = renderHook(() => useAddressBook('acc-1' as AccountId));
    expect(result.current.labels.ownAccountsSectionLabel).toBe(
      'v2.sheets.address-book.own-accounts-section',
    );
    expect(result.current.labels.contactsSectionLabel).toBe(
      'v2.sheets.address-book.contacts-section',
    );
  });
});
