/**
 * Wallet identifier — double BLAKE2b-128, via `@cardano-sdk/crypto` through the
 * `@lace-lib/vendor` seam (ADR 37). The SDK's `blake2b.hash` hex-decodes its input and
 * hex-encodes the digest; chaining two over a 16-byte digest derives the walletId. Host,
 * guest and migration agree on the id for a given key/mnemonic because they run the same
 * SDK code (ADR 37/38).
 *
 * The value object lives here, colocated with its derivation (ADR 13): the derivation
 * returns a `WalletId` directly, so callers need not re-wrap. `@lace-contract/wallet-repo`
 * re-exports `WalletId`.
 */
import { Buffer, Crypto, util } from '@lace-lib/vendor';

import type { HexBlob, Tagged } from '@lace-lib/vendor';

const WALLET_ID_BYTES = 16;

const doubleBlake2b128 = (inputHex: HexBlob): WalletId => {
  const digest = Crypto.blake2b.hash<Crypto.Hash32ByteBase16>(
    inputHex,
    WALLET_ID_BYTES,
  );
  return WalletId(
    Crypto.blake2b.hash<Crypto.Hash32ByteBase16>(digest, WALLET_ID_BYTES),
  );
};

/** For BIP-32 wallets: hash of the extended account public key or of the mnemonic. For script wallets: script hash */
export type WalletId = Tagged<string, 'WalletId'>;
export const WalletId = (walletId: string): WalletId => walletId as WalletId;

/** Derive a walletId from an extended account public key (xpub). */
WalletId.deriveFromBip32PublicKey = (
  xpubHex: Crypto.Bip32PublicKeyHex,
): WalletId => doubleBlake2b128(xpubHex);

/**
 * Derive a walletId from a hardware device's BIP-32 master key fingerprint
 * (`xfpHex` — 8 hex chars / 4 bytes), domain-separated by `vendorTag` (the device
 * family: `'ledger'`, `'trezor'`).
 *
 * The xfp identifies the master key itself, so it is invariant across derivation
 * paths and across mainnet/testnet (whose account xpubs differ): one physical
 * device is one wallet whichever network its open app served. The vendor tag is
 * what keeps one seed restored onto two device families two wallets — the xfp
 * alone is identical for both. Same double blake2b-128 as the xpub mints, so every
 * id shares one 32-hex format and one collision domain.
 */
WalletId.deriveFromHardwareFingerprint = (
  vendorTag: string,
  xfpHex: string,
): WalletId =>
  doubleBlake2b128(
    Buffer.from(`${vendorTag}:${xfpHex.toLowerCase()}`, 'utf8').toString(
      'hex',
    ) as HexBlob,
  );

/** Derive a walletId from a mnemonic — the utf8 bytes of the space-joined words. */
WalletId.deriveFromMnemonic = (words: string[]): WalletId =>
  doubleBlake2b128(
    Buffer.from(util.joinMnemonicWords(words), 'utf8').toString(
      'hex',
    ) as HexBlob,
  );
