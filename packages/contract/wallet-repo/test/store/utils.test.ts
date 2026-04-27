import { BlockchainNetworkId } from '@lace-contract/network';
import { describe, expect, it } from 'vitest';

import { AccountId, WalletId, WalletType } from '../../src';
import {
  getNextActiveAccount,
  isAccountVisibleOnNetwork,
  updateActiveAccountAfterAccountRemoval,
  updateActiveAccountAfterWalletUpdate,
} from '../../src/store/utils';

import type { HardwareWallet } from '../../src';
import type { repositorySlice } from '../../src/store/repo-slice';

const mockAccountId1 = AccountId('account-1');
const mockAccountId2 = AccountId('account-2');
const mockAccountId3 = AccountId('account-3');

const mockWalletId1 = WalletId('wallet-1');
const mockWalletId2 = WalletId('wallet-2');
const mockWalletId3 = WalletId('wallet-3');

const createHardwareWallet = (
  walletId: WalletId,
  accountIds: AccountId[],
): HardwareWallet => ({
  walletId,
  type: WalletType.HardwareLedger,
  metadata: { name: `Wallet ${walletId}`, order: 0 },
  blockchainSpecific: {},
  accounts: accountIds.map(accountId => ({
    accountId,
    accountType: 'HardwareLedger',
    networkType: 'testnet',
    blockchainNetworkId: BlockchainNetworkId('cardano-1'),
    walletId,
    blockchainName: 'Cardano',
    blockchainSpecific: {},
    metadata: { name: `Account ${accountId}` },
  })),
});

describe('utils', () => {
  const mockState: Readonly<ReturnType<typeof repositorySlice.reducer>> = {
    ids: [mockWalletId1, mockWalletId2, mockWalletId3],
    entities: {
      [mockWalletId1]: createHardwareWallet(mockWalletId1, [mockAccountId1]),
      [mockWalletId2]: createHardwareWallet(mockWalletId2, [
        mockAccountId2,
        mockAccountId3,
      ]),
      [mockWalletId3]: createHardwareWallet(mockWalletId3, []),
    },
    isWalletRepoMigrating: false,
    activeAccountContext: {
      walletId: mockWalletId1,
      accountId: mockAccountId1,
    },
  };

  describe('getNextActiveAccount', () => {
    it('should return the first wallet and its first account if wallets with accounts exist', () => {
      const state = {
        ...mockState,
        entities: {
          ...mockState.entities,
          [mockWalletId1]: {
            walletId: mockWalletId1,
            accounts: [],
          },
        },
        ids: [mockWalletId1, mockWalletId2],
      };
      const nextActiveWallet = getNextActiveAccount(state);
      expect(nextActiveWallet).toEqual({
        walletId: mockWalletId2,
        accountId: mockAccountId2,
      });
    });

    it('should return null if no wallets have any accounts', () => {
      const state = {
        ...mockState,
        entities: {
          ...mockState.entities,
          [mockWalletId1]: { walletId: mockWalletId1, accounts: [] },
          [mockWalletId2]: { walletId: mockWalletId2, accounts: [] },
        },
        ids: [mockWalletId1, mockWalletId2],
      };
      const nextActiveWallet = getNextActiveAccount(state);
      expect(nextActiveWallet).toBeNull();
    });

    it('should return null if there are no wallets in the state', () => {
      const state = {
        ids: [],
        entities: {},
        isWalletRepoMigrating: false,
        activeAccountContext: null,
      };
      const nextActiveWallet = getNextActiveAccount(state);
      expect(nextActiveWallet).toBeNull();
    });
  });

  describe('updateActiveWalletAfterWalletUpdate', () => {
    it('should not change active context if the updated wallet is not the active one', () => {
      const state = { ...mockState };
      updateActiveAccountAfterWalletUpdate(state, mockWalletId2);
      expect(state.activeAccountContext).toEqual({
        walletId: mockWalletId1,
        accountId: mockAccountId1,
      });
    });

    it('should not change active context if the active account is still present after the update', () => {
      const state = mockState;
      state.entities[mockWalletId1] = createHardwareWallet(mockWalletId1, [
        mockAccountId1,
        AccountId('new-account'),
      ]);
      updateActiveAccountAfterWalletUpdate(state, mockWalletId1);
      expect(state.activeAccountContext).toEqual({
        walletId: mockWalletId1,
        accountId: mockAccountId1,
      });
    });

    it('should pick the next available account if the active account is removed', () => {
      const state = mockState;
      // Remove the active account from the active wallet
      state.entities[mockWalletId1] = createHardwareWallet(mockWalletId1, []);
      updateActiveAccountAfterWalletUpdate(state, mockWalletId1);
      expect(state.activeAccountContext).toEqual({
        walletId: mockWalletId2,
        accountId: mockAccountId2,
      });
    });

    it('should set active context to null if no other wallet with accounts is available', () => {
      const state: ReturnType<typeof repositorySlice.reducer> = {
        ids: [mockWalletId1, mockWalletId2],
        entities: {
          [mockWalletId1]: createHardwareWallet(mockWalletId1, [
            mockAccountId1,
          ]),
          [mockWalletId2]: createHardwareWallet(mockWalletId2, []), // Wallet 2 has no accounts
        },
        isWalletRepoMigrating: false,
        activeAccountContext: {
          walletId: mockWalletId1,
          accountId: mockAccountId1,
        },
      };

      state.entities[mockWalletId1] = createHardwareWallet(mockWalletId1, []);
      updateActiveAccountAfterWalletUpdate(state, mockWalletId1);

      expect(state.activeAccountContext).toBeNull();
    });
  });

  describe('updateActiveWalletAfterAccountRemoval', () => {
    it('should not change active context if the removed account is not the active one', () => {
      const state = {
        ...mockState,
        isWalletRepoMigrating: false,
        activeAccountContext: {
          walletId: mockWalletId2,
          accountId: mockAccountId2,
        },
      };
      // Remove a different account from the active wallet
      updateActiveAccountAfterAccountRemoval(
        state,
        mockWalletId2,
        mockAccountId3,
      );
      expect(state.activeAccountContext).toEqual({
        walletId: mockWalletId2,
        accountId: mockAccountId2,
      });
    });

    it('should not change active context if the removed account is from a different (non-active) wallet', () => {
      const state = {
        ...mockState,
        isWalletRepoMigrating: false,
        activeAccountContext: {
          walletId: mockWalletId1,
          accountId: mockAccountId1,
        },
      };
      // Remove an account from a non-active wallet
      updateActiveAccountAfterAccountRemoval(
        state,
        mockWalletId2,
        mockAccountId2,
      );
      expect(state.activeAccountContext).toEqual({
        walletId: mockWalletId1,
        accountId: mockAccountId1,
      });
    });

    it('should update to the next account in the same wallet if the active account is removed', () => {
      const state = {
        ...mockState,
        isWalletRepoMigrating: false,
        activeAccountContext: {
          walletId: mockWalletId2,
          accountId: mockAccountId2,
        },
      };
      state.entities[mockWalletId2] = createHardwareWallet(mockWalletId2, [
        mockAccountId3,
      ]);
      updateActiveAccountAfterAccountRemoval(
        state,
        mockWalletId2,
        mockAccountId2,
      );
      // The new active account should be the next one in the list for that wallet
      expect(state.activeAccountContext).toEqual({
        walletId: mockWalletId2,
        accountId: mockAccountId3,
      });
    });

    it('should set active context to null if the removed account was the last active one in the app', () => {
      const state: ReturnType<typeof repositorySlice.reducer> = {
        ids: [mockWalletId1],
        entities: {
          ...mockState.entities,
          [mockWalletId1]: {
            walletId: mockWalletId1,
            accounts: [{ accountId: mockAccountId1 }],
          },
        },
        isWalletRepoMigrating: false,
        activeAccountContext: {
          walletId: mockWalletId1,
          accountId: mockAccountId1,
        },
      };
      // "Remove" the active account
      state.entities[mockWalletId1] = createHardwareWallet(mockWalletId1, []);
      updateActiveAccountAfterAccountRemoval(
        state,
        mockWalletId1,
        mockAccountId1,
      );
      expect(state.activeAccountContext).toBeNull();
    });
  });

  describe('isAccountVisibleOnNetwork', () => {
    const cardanoMainnetNetworkId = BlockchainNetworkId('cardano-mainnet');
    const cardanoPreviewNetworkId = BlockchainNetworkId('cardano-preview');
    const cardanoPreprodNetworkId = BlockchainNetworkId('cardano-preprod');

    const createAccount = (
      networkType: 'mainnet' | 'testnet',
      blockchainNetworkId: ReturnType<typeof BlockchainNetworkId>,
    ) => ({
      accountId: mockAccountId1,
      accountType: 'HardwareLedger' as const,
      networkType,
      blockchainNetworkId,
      walletId: mockWalletId1,
      blockchainName: 'Cardano' as const,
      blockchainSpecific: {},
      metadata: { name: 'Test Account' },
    });

    it('returns false when networkType is undefined', () => {
      const account = createAccount('mainnet', cardanoMainnetNetworkId);
      expect(isAccountVisibleOnNetwork(account, undefined, undefined)).toBe(
        false,
      );
    });

    it('returns false when account networkType does not match active networkType', () => {
      const account = createAccount('testnet', cardanoPreviewNetworkId);
      expect(isAccountVisibleOnNetwork(account, 'mainnet', undefined)).toBe(
        false,
      );
    });

    it('returns true for mainnet accounts when active network is mainnet', () => {
      const account = createAccount('mainnet', cardanoMainnetNetworkId);
      expect(isAccountVisibleOnNetwork(account, 'mainnet', undefined)).toBe(
        true,
      );
    });

    it('returns true for testnet accounts when no blockchain networks configured', () => {
      const account = createAccount('testnet', cardanoPreviewNetworkId);
      expect(isAccountVisibleOnNetwork(account, 'testnet', undefined)).toBe(
        true,
      );
    });

    it('returns true for testnet accounts when blockchain has no network config', () => {
      const account = createAccount('testnet', cardanoPreviewNetworkId);
      expect(isAccountVisibleOnNetwork(account, 'testnet', {})).toBe(true);
    });

    it('returns true when testnet account matches selected testnet network ID', () => {
      const account = createAccount('testnet', cardanoPreviewNetworkId);
      expect(
        isAccountVisibleOnNetwork(account, 'testnet', {
          Cardano: {
            mainnet: cardanoMainnetNetworkId,
            testnet: cardanoPreviewNetworkId,
          },
        }),
      ).toBe(true);
    });

    it('returns false when testnet account does not match selected testnet network ID', () => {
      const account = createAccount('testnet', cardanoPreviewNetworkId);
      expect(
        isAccountVisibleOnNetwork(account, 'testnet', {
          Cardano: {
            mainnet: cardanoMainnetNetworkId,
            testnet: cardanoPreprodNetworkId,
          },
        }),
      ).toBe(false);
    });

    it('returns true when mainnet account matches selected mainnet network ID', () => {
      const account = createAccount('mainnet', cardanoMainnetNetworkId);
      expect(
        isAccountVisibleOnNetwork(account, 'mainnet', {
          Cardano: {
            mainnet: cardanoMainnetNetworkId,
            testnet: cardanoPreviewNetworkId,
          },
        }),
      ).toBe(true);
    });
  });
});
