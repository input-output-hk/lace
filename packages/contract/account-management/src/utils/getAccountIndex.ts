import type { AnyAccount } from '@lace-contract/wallet-repo';

/**
 * Extracts the accountIndex from an account's blockchain-specific data.
 * Falls back to 0 when the property is absent.
 */
export const getAccountIndex = (account: AnyAccount): number => {
  const blockchainSpecific = account.blockchainSpecific as {
    accountIndex?: number;
  };
  return blockchainSpecific?.accountIndex ?? 0;
};
