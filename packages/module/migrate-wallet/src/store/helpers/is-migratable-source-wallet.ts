import { WalletType } from '@lace-contract/wallet-repo';

import type { AnyWallet } from '@lace-contract/wallet-repo';

/**
 * Wallet types the migration can use as a LOADED source: mnemonic wallets
 * sign through their encrypted root, hardware wallets through the signer
 * factory's device connectors — both without re-importing anything. Excludes
 * LazyInMemory, whose signing material is not held by Lace at all, and
 * script wallets, which have no single signing identity to sweep with.
 */
const MIGRATABLE_SOURCE_TYPES: ReadonlySet<WalletType> = new Set([
  WalletType.InMemory,
  WalletType.HardwareLedger,
  WalletType.HardwareTrezor,
  WalletType.HardwareKeystone,
  WalletType.HardwareSeedSigner,
]);

export const isMigratableSourceWallet = (
  wallet: AnyWallet | undefined,
): boolean => wallet !== undefined && MIGRATABLE_SOURCE_TYPES.has(wallet.type);
