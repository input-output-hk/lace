import { WalletType } from '@lace-contract/wallet-repo';

// Every WalletType, not just the ones the flow was designed around. The
// hardware destination picker enumerates whatever modules contribute
// onboarding options and filters only on Cardano support — it holds no
// Ledger/Trezor allow-list — so enabling KEYSTONE or SEED_SIGNER makes those
// devices selectable here with no change to this module. Without their labels
// the review and done screens fall through to the raw enum member.
const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  [WalletType.InMemory]: 'Software',
  [WalletType.LazyInMemory]: 'Software',
  [WalletType.HardwareLedger]: 'Ledger',
  [WalletType.HardwareTrezor]: 'Trezor',
  [WalletType.HardwareSeedSigner]: 'SeedSigner',
  [WalletType.HardwareKeystone]: 'Keystone',
  [WalletType.MultiSig]: 'Shared',
};

/**
 * Presentable name for a wallet's type. Without it the raw enum member
 * ("LazyInMemory", "HardwareTrezor") reaches the screen.
 */
export const walletTypeLabel = (type: WalletType): string =>
  WALLET_TYPE_LABELS[type] ?? type;
