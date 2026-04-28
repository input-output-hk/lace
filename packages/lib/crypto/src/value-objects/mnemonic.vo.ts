import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { hexToBytes } from '@noble/hashes/utils';
import { entropyToMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import type { EntropyHex } from './entropy-hex.vo';
import type { Tagged } from 'type-fest';

/** BIP39 mnemonic word list. */
export type Mnemonic = Tagged<string[], 'Mnemonic'>;
export const Mnemonic = (words: string[]): Mnemonic => words as Mnemonic;

/**
 * Derives a BIP39 mnemonic from hex-encoded entropy.
 * Uses HKDF for domain separation — the raw entropy is never used directly.
 */
Mnemonic.deriveFrom = (entropyHex: EntropyHex): Mnemonic => {
  const rawKey = hexToBytes(entropyHex);
  const derived = hkdf(sha256, rawKey, 'lace', 'wallet-seed', 32);
  const mnemonic = entropyToMnemonic(derived, wordlist);
  return Mnemonic(mnemonic.split(' '));
};
