import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import { EntropyHex } from '../src/value-objects/entropy-hex.vo';
import { Mnemonic } from '../src/value-objects/mnemonic.vo';

describe('Mnemonic.deriveFrom', () => {
  const sampleKeyHex = 'a'.repeat(64); // 32 bytes of 0xaa

  it('returns a valid 24-word BIP39 mnemonic', () => {
    const result = Mnemonic.deriveFrom(EntropyHex(sampleKeyHex));

    expect(result).toHaveLength(24);
    expect(validateMnemonic(result.join(' '), wordlist)).toBe(true);
  });

  it('is deterministic — same input produces same mnemonic', () => {
    const result1 = Mnemonic.deriveFrom(EntropyHex(sampleKeyHex));
    const result2 = Mnemonic.deriveFrom(EntropyHex(sampleKeyHex));

    expect(result1).toEqual(result2);
  });

  it('produces a stable mnemonic for known input (golden test)', () => {
    const result = Mnemonic.deriveFrom(EntropyHex('a'.repeat(64)));

    expect(result.join(' ')).toMatchInlineSnapshot(
      `"enlist silver food increase also benefit report expire female smart genre begin chuckle wood ill permit sausage arena century sugar print ugly manage guide"`,
    );
  });

  it('different keys produce different mnemonics', () => {
    const keyA = 'a'.repeat(64);
    const keyB = 'b'.repeat(64);

    const resultA = Mnemonic.deriveFrom(EntropyHex(keyA));
    const resultB = Mnemonic.deriveFrom(EntropyHex(keyB));

    expect(resultA).not.toEqual(resultB);
  });

  it('freezes the inner HKDF, English words and BIP-39 seed for recipe v1', () => {
    const entropy =
      '76ae9b46d9a4a6238b6149f32f6511fb9b4f95aa3b9c5ff6d69176fcc13a443f';
    expect(
      bytesToHex(hkdf(sha256, hexToBytes(entropy), 'lace', 'wallet-seed', 32)),
    ).toBe('52659fc15566225cfada6f06e9dd98a2fc92461324ae7056d020a19102605a67');
    const words = Mnemonic.deriveFrom(EntropyHex(entropy));
    expect(words.join(' ')).toBe(
      'fame coconut utility print giraffe common twin evil alone exclude great echo since cart erode noise icon repair amused drip awake coral hat unveil',
    );
    expect(bytesToHex(Mnemonic.toSeed(words))).toBe(
      'f1e3c3e382a33597bb8e607d3f86bc5ebba3c09419cee76805b0e2b4794809b1aa3e64b74ff514ea6b006a0722377aa37c4f6febfc684fa2d1b3bf419539f9d1',
    );
  });
});

describe('Mnemonic.toSeed', () => {
  const knownMnemonic = Mnemonic([
    ...Array.from({ length: 11 }, () => 'abandon'),
    'about',
  ]);

  it('produces the BIP39 seed of a known mnemonic with an empty passphrase (golden test)', () => {
    const seed = Mnemonic.toSeed(knownMnemonic);

    expect(seed).toHaveLength(64);
    expect(bytesToHex(seed)).toBe(
      '5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4',
    );
  });

  it('matches the reference implementation', () => {
    expect(Mnemonic.toSeed(knownMnemonic)).toEqual(
      mnemonicToSeedSync(knownMnemonic.join(' ')),
    );
  });

  it('is deterministic for a derived mnemonic', () => {
    const words = Mnemonic.deriveFrom(EntropyHex('a'.repeat(64)));

    expect(Mnemonic.toSeed(words)).toEqual(Mnemonic.toSeed(words));
    expect(Mnemonic.toSeed(words)).toHaveLength(64);
  });

  it('different mnemonics produce different seeds', () => {
    const seedA = Mnemonic.toSeed(
      Mnemonic.deriveFrom(EntropyHex('a'.repeat(64))),
    );
    const seedB = Mnemonic.toSeed(
      Mnemonic.deriveFrom(EntropyHex('b'.repeat(64))),
    );

    expect(seedA).not.toEqual(seedB);
  });
});
