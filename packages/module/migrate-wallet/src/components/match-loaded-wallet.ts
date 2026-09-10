import { WalletId } from '@lace-contract/wallet-repo';

/**
 * Which loaded wallet an entered recovery phrase derives, if any. `destination`
 * is the wallet this migration just created, so the phrase is the new one and
 * the user meant to enter their old one. `other` is any wallet already loaded
 * before the migration, which FR-9 makes a legitimate source, but only by
 * selecting it, a path that does not exist yet.
 */
export type LoadedWalletMatch = 'destination' | 'other' | undefined;

/**
 * Classifies an entered phrase against the wallets Lace has loaded. Wallet-repo
 * dedups on the derived id, so importing a phrase that matches a loaded wallet
 * adds no distinct source and the import waits for a wallet that never appears.
 * Both matches are refused at entry for that reason, but they are different
 * mistakes and get different copy. Expects an already-validated mnemonic.
 */
export const matchLoadedWallet = (
  words: string[],
  {
    destinationWalletId,
    loadedWalletIds,
  }: {
    destinationWalletId: WalletId | undefined;
    loadedWalletIds: readonly WalletId[];
  },
): LoadedWalletMatch => {
  const enteredWalletId = WalletId.deriveFromMnemonic(words);
  if (enteredWalletId === destinationWalletId) return 'destination';
  return loadedWalletIds.includes(enteredWalletId) ? 'other' : undefined;
};
