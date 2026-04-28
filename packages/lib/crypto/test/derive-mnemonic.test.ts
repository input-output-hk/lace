import { validateMnemonic } from '@scure/bip39';
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
});
