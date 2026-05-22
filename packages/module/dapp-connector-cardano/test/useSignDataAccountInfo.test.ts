/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSignDataAccountInfo } from '../src/common/hooks/useSignDataAccountInfo';

import type { AnyAccount } from '@lace-contract/wallet-repo';

vi.mock('../src/common/hooks/storeHooks', () => ({
  useLaceSelector: vi.fn(),
}));

const storeHooks = await import('../src/common/hooks/storeHooks');
const mockUseLaceSelector = vi.mocked(storeHooks.useLaceSelector);

// ─── fixtures ─────────────────────────────────────────────────────────────────

const DAPP_ORIGIN = 'https://governance-app.example';
const OTHER_ORIGIN = 'https://other-dapp.example';

const accountA = {
  accountId: 'acc-A',
  walletId: 'wallet-1',
  metadata: {
    name: 'Account Alpha',
    avatarUri: 'https://example.com/alpha.png',
  },
} as unknown as AnyAccount;

const accountB = {
  accountId: 'acc-B',
  walletId: 'wallet-1',
  metadata: { name: 'Account Beta' },
} as unknown as AnyAccount;

const sessionAccountByOrigin: Record<string, string> = {
  [DAPP_ORIGIN]: accountB.accountId,
};

const setupSelector = ({
  accounts = [accountA, accountB] as AnyAccount[],
  sessionMapping = sessionAccountByOrigin,
}: {
  accounts?: AnyAccount[];
  sessionMapping?: Record<string, string>;
} = {}) => {
  mockUseLaceSelector.mockImplementation((selector: string) => {
    if (selector === 'wallets.selectActiveNetworkAccounts') return accounts;
    if (selector === 'cardanoDappConnector.selectSessionAccountByOrigin')
      return sessionMapping;
    return undefined;
  });
};

// ─── tests ────────────────────────────────────────────────────────────────────

describe('useSignDataAccountInfo', () => {
  it('returns the account mapped to the dApp origin', () => {
    setupSelector();

    const { result } = renderHook(() => useSignDataAccountInfo(DAPP_ORIGIN));

    expect(result.current).toEqual({
      name: accountB.metadata.name,
      avatarUri: undefined,
    });
  });

  it('includes avatarUri when the session account has one', () => {
    const accountWithAvatar = {
      ...accountB,
      metadata: { name: 'Beta', avatarUri: 'https://example.com/beta.png' },
    } as unknown as AnyAccount;
    setupSelector({ accounts: [accountA, accountWithAvatar] });

    const { result } = renderHook(() => useSignDataAccountInfo(DAPP_ORIGIN));

    expect(result.current?.avatarUri).toBe('https://example.com/beta.png');
  });

  it('returns undefined when no origin is given', () => {
    setupSelector();

    const { result } = renderHook(() => useSignDataAccountInfo());

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when origin has no session entry', () => {
    setupSelector();

    const { result } = renderHook(() => useSignDataAccountInfo(OTHER_ORIGIN));

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when session account is not in allAccounts', () => {
    // Session says acc-B but it has been removed from the active network
    setupSelector({ accounts: [accountA] });

    const { result } = renderHook(() => useSignDataAccountInfo(DAPP_ORIGIN));

    expect(result.current).toBeUndefined();
  });

  it('uses the session account, not the first account in the list', () => {
    // accountA is first in the list but the session maps DAPP_ORIGIN to accountB
    setupSelector();

    const { result } = renderHook(() => useSignDataAccountInfo(DAPP_ORIGIN));

    expect(result.current?.name).toBe(accountB.metadata.name);
    expect(result.current?.name).not.toBe(accountA.metadata.name);
  });
});
