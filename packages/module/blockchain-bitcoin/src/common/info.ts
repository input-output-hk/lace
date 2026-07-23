import type { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import type { WalletId } from '@lace-contract/wallet-repo';

/**
 * Extended account public keys for a Bitcoin wallet.
 *
 * In-memory wallets populate every script type from the seed. A watch-only
 * hardware account only exports the active Native SegWit key, so the other
 * script types are optional and absent there.
 */
export type ExtendedAccountPublicKeys = {
  nativeSegWit: string;
  legacy?: string;
  segWit?: string;
  taproot?: string;
};

export type BitcoinWalletInfo = {
  walletId: WalletId;
  network: BitcoinNetwork;
  accountIndex: number;
  extendedAccountPublicKeys: ExtendedAccountPublicKeys;
  /**
   * Device master fingerprint (xfp) as 8-char lowercase hex, present for
   * watch-only hardware accounts so the change output's key-origin can target
   * the device seed. Absent for in-memory accounts.
   */
  masterFingerprint?: string;
};
