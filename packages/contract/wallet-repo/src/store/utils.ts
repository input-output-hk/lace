import type { AnyAccount } from '../types';
import type { AccountId, WalletId } from '../value-objects';
import type { ActiveAccountContext, repositorySlice } from './repo-slice';
import type { BlockchainNetworkConfig } from '@lace-contract/network';
import type { BlockchainName } from '@lace-lib/util-store';

export type BlockchainNetworks = Partial<
  Record<BlockchainName, BlockchainNetworkConfig>
>;

/**
 * Determines if an account is visible on the current network based on:
 * 1. Active network type (mainnet/testnet)
 * 2. The selected network ID per blockchain for the current network type
 *
 * @param account - The account to check visibility for
 * @param networkType - The currently active network type ('mainnet' or 'testnet')
 * @param blockchainNetworks - Map of blockchain names to their network configurations
 * @returns true if the account should be visible on the current network
 */
export const isAccountVisibleOnNetwork = (
  account: AnyAccount,
  networkType: string | undefined,
  blockchainNetworks: BlockchainNetworks | undefined,
): boolean => {
  if (!networkType) return false;
  if (account.networkType !== networkType) return false;

  const networkConfig = blockchainNetworks?.[account.blockchainName];
  const selectedNetworkId =
    networkConfig?.[networkType as keyof BlockchainNetworkConfig];
  if (!selectedNetworkId) return true;
  return account.blockchainNetworkId === selectedNetworkId;
};

/**
 * Gets the next active account context from the first wallet that has accounts.
 * This is typically used when the current active account context becomes invalid
 * (e.g., after wallet/account removal) and we need to select a new default.
 *
 * @param state - The current repository state
 * @returns ActiveAccountContext for the first account of the first wallet with accounts, or null if no accounts exist
 */
export const getNextActiveAccount = (
  state: Readonly<ReturnType<typeof repositorySlice.reducer>>,
): ActiveAccountContext => {
  const firstWalletWithAccounts = state.ids
    .map(id => state.entities[id])
    .find(wallet => wallet?.accounts.length > 0);

  return firstWalletWithAccounts
    ? {
        walletId: firstWalletWithAccounts.walletId,
        accountId: firstWalletWithAccounts.accounts[0].accountId,
      }
    : null;
};

/**
 * Gets the next active account context within a specific wallet.
 * If the wallet has accounts, returns the first one. If not, falls back to
 * getNextActiveAccount to find an account from any wallet.
 *
 * @param state - The current repository state
 * @param walletId - The ID of the wallet to search within
 * @returns ActiveAccountContext for the first account in the specified wallet, or falls back to any available account
 */
const getNextActiveAccountInWallet = (
  state: Readonly<ReturnType<typeof repositorySlice.reducer>>,
  walletId: WalletId,
): ActiveAccountContext => {
  const wallet = state.entities[walletId];
  if (wallet && wallet.accounts.length > 0) {
    return {
      walletId: wallet.walletId,
      accountId: wallet.accounts[0].accountId,
    };
  }
  return getNextActiveAccount(state);
};

/**
 * Updates the active account context after a wallet has been modified.
 *
 * This function ensures the active account context remains valid after a wallet update.
 * If the updated wallet contains the currently active account, it checks whether that
 * account still exists in the updated wallet. If the active account has been removed
 * during the update, it automatically selects the next available account.
 *
 * @param state - The mutable wallet repository state that may be modified
 * @param walletId - The ID of the wallet that was just updated
 * @returns void - The function mutates the state directly
 */
export const updateActiveAccountAfterWalletUpdate = (
  state: ReturnType<typeof repositorySlice.reducer>,
  walletId: WalletId,
): void => {
  if (state.activeAccountContext?.walletId !== walletId) return;

  const updatedWallet = state.entities[walletId];
  const isActiveAccountPresent =
    updatedWallet?.accounts.some(
      account => account.accountId === state.activeAccountContext?.accountId,
    ) ?? false;

  if (!isActiveAccountPresent) {
    state.activeAccountContext = getNextActiveAccount(state);
  }
};

/**
 * Updates the active account context after an account has been removed from a wallet.
 *
 * This function checks if the removed account was the currently active account.
 * If so, it attempts to find the next suitable active account by first looking
 * for other accounts in the same wallet, and if none exist, it falls back to
 * selecting the next available account from any wallet.
 *
 * @param state - The mutable wallet repository state that may be modified
 * @param walletId - The ID of the wallet from which the account was removed
 * @param accountId - The ID of the account that was just removed
 * @returns void - The function mutates the state directly
 */
export const updateActiveAccountAfterAccountRemoval = (
  state: ReturnType<typeof repositorySlice.reducer>,
  walletId: WalletId,
  accountId: AccountId,
): void => {
  if (
    state.activeAccountContext?.walletId === walletId &&
    state.activeAccountContext?.accountId === accountId
  ) {
    state.activeAccountContext = getNextActiveAccountInWallet(state, walletId);
  }
};
