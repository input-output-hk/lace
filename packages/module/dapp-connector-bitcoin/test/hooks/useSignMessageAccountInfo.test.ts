/**
 * @vitest-environment jsdom
 */
import { AccountId } from '@lace-contract/wallet-repo';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSignMessageAccountInfo } from '../../src/hooks/useSignMessageAccountInfo';

import type { AnyAddress } from '@lace-contract/addresses';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const mocks = vi.hoisted(() => ({
  selectors: {} as Record<string, unknown>,
}));

vi.mock('../../src/hooks/storeHooks', () => ({
  useLaceSelector: (key: string) => mocks.selectors[key],
}));

const OWN_ADDRESS = 'bc1qowned0000000000000000000000000000000';
const UNOWNED_ADDRESS = 'bc1qunowned00000000000000000000000000000';

const bitcoinAccount = {
  accountId: AccountId('bitcoin-account-0'),
  walletId: 'wallet-0',
  metadata: { name: 'Bitcoin 0', avatarUri: 'https://example.com/avatar.png' },
} as unknown as AnyAccount;

const bitcoinAddress = {
  address: OWN_ADDRESS,
  blockchainName: 'Bitcoin',
  accountId: bitcoinAccount.accountId,
} as unknown as AnyAddress;

const cardanoAddress = {
  address: OWN_ADDRESS,
  blockchainName: 'Cardano',
  accountId: AccountId('cardano-account-0'),
} as unknown as AnyAddress;

const setSelectors = (overrides: Record<string, unknown>) => {
  mocks.selectors = {
    'addresses.selectAllAddresses': [bitcoinAddress],
    'wallets.selectActiveNetworkAccounts': [bitcoinAccount],
    ...overrides,
  };
};

describe('useSignMessageAccountInfo', () => {
  beforeEach(() => {
    setSelectors({});
  });

  it('returns the account owning the address, including its avatar and id', () => {
    const { result } = renderHook(() => useSignMessageAccountInfo(OWN_ADDRESS));

    expect(result.current).toEqual({
      name: 'Bitcoin 0',
      avatarUri: 'https://example.com/avatar.png',
      accountId: bitcoinAccount.accountId,
    });
  });

  it('returns undefined when the address is not owned by any active account', () => {
    const { result } = renderHook(() =>
      useSignMessageAccountInfo(UNOWNED_ADDRESS),
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the owning address has no matching account on the active network', () => {
    setSelectors({ 'wallets.selectActiveNetworkAccounts': [] });

    const { result } = renderHook(() => useSignMessageAccountInfo(OWN_ADDRESS));

    expect(result.current).toBeUndefined();
  });

  it('ignores addresses from other blockchains that share the same address string', () => {
    setSelectors({
      'addresses.selectAllAddresses': [cardanoAddress],
    });

    const { result } = renderHook(() => useSignMessageAccountInfo(OWN_ADDRESS));

    expect(result.current).toBeUndefined();
  });

  it('omits avatarUri when the account metadata has none', () => {
    const accountWithoutAvatar = {
      ...bitcoinAccount,
      metadata: { name: 'Bitcoin 0' },
    } as unknown as AnyAccount;
    setSelectors({
      'wallets.selectActiveNetworkAccounts': [accountWithoutAvatar],
    });

    const { result } = renderHook(() => useSignMessageAccountInfo(OWN_ADDRESS));

    expect(result.current?.avatarUri).toBeUndefined();
  });
});
