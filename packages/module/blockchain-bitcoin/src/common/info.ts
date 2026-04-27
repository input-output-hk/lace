import type { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import type { WalletId } from '@lace-contract/wallet-repo';

/**
 * Extended account public keys for a Bitcoin wallet.
 *
 * @typedef {Object} ExtendedAccountPublicKeys
 * @property {string} legacy - The extended public key for legacy addresses (base58 encoded).
 * @property {string} segWit - The extended public key for SegWit addresses (base58 encoded).
 * @property {string} nativeSegWit - The extended public key for Native SegWit addresses (base58 encoded).
 * @property {string} taproot - The extended public key for Taproot addresses (base58 encoded).
 * @property {string} electrumNativeSegWit - The extended public key for Electrum Native SegWit addresses (base58 encoded).
 */
export type ExtendedAccountPublicKeys = {
  legacy: string;
  segWit: string;
  nativeSegWit: string;
  taproot: string;
  electrumNativeSegWit: string;
};

export type BitcoinWalletInfo = {
  walletId: WalletId;
  network: BitcoinNetwork;
  accountIndex: number;
  extendedAccountPublicKeys: ExtendedAccountPublicKeys;
};
