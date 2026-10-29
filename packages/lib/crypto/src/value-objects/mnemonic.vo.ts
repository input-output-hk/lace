import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { hexToBytes } from '@noble/hashes/utils';
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import type { EntropyHex } from './entropy-hex.vo';
import type { Tagged } from 'type-fest';

/** BIP39 mnemonic word list. */
export type Mnemonic = Tagged<string[], 'Mnemonic'>;
/**
 * Types a list of words as a BIP-39 mnemonic; it checks nothing.
 * `Mnemonic.deriveFrom(entropy)` derives 24 words from 32 bytes of entropy,
 * and `Mnemonic.toSeed(words)` gives their BIP-39 seed.
 */
export const Mnemonic = (words: string[]): Mnemonic => words as Mnemonic;

/**
 * Derives a 24-word BIP39 mnemonic from 32 bytes of hex-encoded entropy.
 * Uses HKDF for domain separation, so the raw entropy is never used
 * directly as seed material. The entropy bytes and the expanded key are zeroed once the
 * words exist; the words themselves are strings and cannot be.
 */
Mnemonic.deriveFrom = (entropyHex: EntropyHex): Mnemonic => {
  const rawKey = hexToBytes(entropyHex);
  const derived = hkdf(sha256, rawKey, 'lace', 'wallet-seed', 32);
  try {
    return Mnemonic(entropyToMnemonic(derived, wordlist).split(' '));
  } finally {
    rawKey.fill(0);
    derived.fill(0);
  }
};

/**
 * The 64-byte BIP39 seed of the mnemonic with an empty passphrase: the seed
 * that wallets deriving their keys from the BIP39 seed consume, so secrets
 * derived from it match what such a wallet built from the same words would
 * derive. The caller owns the bytes and zeroes them after use.
 */
Mnemonic.toSeed = (words: Mnemonic): Uint8Array =>
  mnemonicToSeedSync(words.join(' '));
