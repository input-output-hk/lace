import type { AnyWallet } from '@lace-contract/wallet-repo';

/**
 * Extracts all account names from every wallet.
 * Applies null-safe guards on the `accounts` array so callers
 * don't need to repeat defensive `?? []` checks.
 */
export const getAllAccountNames = (wallets: AnyWallet[]): string[] =>
  wallets.flatMap(w => (w.accounts ?? []).map(a => a.metadata.name));
