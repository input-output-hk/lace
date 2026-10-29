import { util } from '../../src';

describe('bip39', () => {
  // Vectors from the BIP-39 reference test suite (trezor/python-mnemonic).
  const vectors = [
    {
      entropy: '00000000000000000000000000000000',
      mnemonic:
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    },
    {
      entropy:
        'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      mnemonic:
        'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote',
    },
    {
      entropy:
        '68a79eaca2324873eacc50cb9c6eca8cc68ea5d936f98787c60c7ebc74e6ce7c',
      mnemonic:
        'hamster diagram private dutch cause delay private meat slide toddler razor book happy fancy gospel tennis maple dilemma loan word shrug inflict delay length',
    },
  ];

  it.each(vectors)(
    'entropy $entropy round-trips through words',
    ({ entropy, mnemonic }) => {
      const words = util.entropyToMnemonicWords(entropy);
      expect(util.joinMnemonicWords(words)).toBe(mnemonic);
      expect(util.mnemonicWordsToEntropy(words)).toBe(entropy);
      expect(util.mnemonicToWords(mnemonic)).toEqual(words);
    },
  );

  it('validateMnemonic accepts the vectors and rejects a bad checksum', () => {
    for (const { mnemonic } of vectors)
      expect(util.validateMnemonic(mnemonic)).toBe(true);
    expect(
      util.validateMnemonic(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon',
      ),
    ).toBe(false);
  });

  it('generateMnemonicWords produces 24 valid words by default and 12 for 128 bits', () => {
    const words = util.generateMnemonicWords();
    expect(words).toHaveLength(24);
    expect(util.validateMnemonic(util.joinMnemonicWords(words))).toBe(true);
    expect(util.generateMnemonicWords(128)).toHaveLength(12);
  });
});
