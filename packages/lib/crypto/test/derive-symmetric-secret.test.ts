import { bytesToHex } from '@noble/hashes/utils';

import { deriveSymmetricSecret } from '../src/derive-symmetric-secret';

const SEED_LENGTH = 64;

const seedOf = (byte: number) => new Uint8Array(SEED_LENGTH).fill(byte);
const accountEncryption = {
  domain: 'lace-passport:acc-enc:v1',
  context: '0',
};

describe('deriveSymmetricSecret', () => {
  it('produces a stable 32-byte secret for the account encryption domain (golden test)', () => {
    const secret = deriveSymmetricSecret(seedOf(0x01), accountEncryption);

    expect(secret).toHaveLength(32);
    expect(bytesToHex(secret)).toBe(
      '483dd05e57a573af91e4c76cb60ea23a74b68bdb9540da22154825a0cfde094d',
    );
  });

  it('produces a stable 64-byte secret when asked for the maximum length (golden test)', () => {
    const secret = deriveSymmetricSecret(seedOf(0x01), {
      ...accountEncryption,
      length: 64,
    });

    expect(secret).toHaveLength(64);
    expect(bytesToHex(secret)).toBe(
      '483dd05e57a573af91e4c76cb60ea23a74b68bdb9540da22154825a0cfde094d334e335644a9ad794cad7f57ebc843991995e8f09f41f9b747c848c60eda69b0',
    );
  });

  it('defaults to 32 bytes', () => {
    expect(
      deriveSymmetricSecret(seedOf(0x01), { ...accountEncryption, length: 32 }),
    ).toEqual(deriveSymmetricSecret(seedOf(0x01), accountEncryption));
  });

  it('is deterministic for the same seed and parameters', () => {
    expect(deriveSymmetricSecret(seedOf(0x01), accountEncryption)).toEqual(
      deriveSymmetricSecret(seedOf(0x01), accountEncryption),
    );
  });

  it('accepts the minimum length of 16 bytes', () => {
    const secret = deriveSymmetricSecret(seedOf(0x01), {
      ...accountEncryption,
      length: 16,
    });

    expect(secret).toHaveLength(16);
    expect(bytesToHex(secret)).toBe('483dd05e57a573af91e4c76cb60ea23a');
  });

  it('changes with the domain', () => {
    const other = deriveSymmetricSecret(seedOf(0x01), {
      ...accountEncryption,
      domain: 'lace-passport:other:v1',
    });

    expect(bytesToHex(other)).toBe(
      'cc9bbaee5c8e0d42844a4ae1bf8150f5aa142e1f8d9925fcc41f2d61d00dc10f',
    );
    expect(other).not.toEqual(
      deriveSymmetricSecret(seedOf(0x01), accountEncryption),
    );
  });

  it('changes with the context', () => {
    const other = deriveSymmetricSecret(seedOf(0x01), {
      ...accountEncryption,
      context: '1',
    });

    expect(bytesToHex(other)).toBe(
      '01b0c7f1b3e9b4dbd96ef57cae05e710847a63ac851d07afc8f5841a66642f0c',
    );
    expect(other).not.toEqual(
      deriveSymmetricSecret(seedOf(0x01), accountEncryption),
    );
  });

  it('changes with the seed', () => {
    const other = deriveSymmetricSecret(seedOf(0x02), accountEncryption);

    expect(bytesToHex(other)).toBe(
      '803ef34e29cf88c1fdbb22d322528d800b9f4711cb14d9390dfd6f7abb8e1bc4',
    );
    expect(other).not.toEqual(
      deriveSymmetricSecret(seedOf(0x01), accountEncryption),
    );
  });

  it('treats composed and decomposed spellings of the domain as the same domain', () => {
    const composed = deriveSymmetricSecret(seedOf(0x01), {
      domain: 'caf\u00e9',
      context: '0',
    });
    const decomposed = deriveSymmetricSecret(seedOf(0x01), {
      domain: 'cafe\u0301',
      context: '0',
    });

    expect(bytesToHex(composed)).toBe(
      '5408572080de9c059b7ce63a8f663747fab186c71c2585e6d97eb2d48a5aa64b',
    );
    expect(decomposed).toEqual(composed);
  });

  it('accepts an empty context', () => {
    expect(
      deriveSymmetricSecret(seedOf(0x01), {
        ...accountEncryption,
        context: '',
      }),
    ).toHaveLength(32);
  });

  it('leaves the seed untouched', () => {
    const seed = seedOf(0x01);
    deriveSymmetricSecret(seed, accountEncryption);
    expect(seed).toEqual(seedOf(0x01));
  });

  it('rejects an empty domain', () => {
    expect(() =>
      deriveSymmetricSecret(seedOf(0x01), { domain: '', context: '0' }),
    ).toThrow('MIP-0015 domain must encode to 1..256 bytes, got 0');
  });

  it('rejects a domain longer than 256 bytes once encoded', () => {
    expect(() =>
      deriveSymmetricSecret(seedOf(0x01), {
        domain: '\u00e9'.repeat(129),
        context: '0',
      }),
    ).toThrow('MIP-0015 domain must encode to 1..256 bytes, got 258');
  });

  it('accepts a domain of exactly 256 bytes', () => {
    expect(
      deriveSymmetricSecret(seedOf(0x01), {
        domain: 'd'.repeat(256),
        context: '0',
      }),
    ).toHaveLength(32);
  });

  it('rejects a context longer than 1024 bytes once encoded', () => {
    expect(() =>
      deriveSymmetricSecret(seedOf(0x01), {
        ...accountEncryption,
        context: 'c'.repeat(1025),
      }),
    ).toThrow('MIP-0015 context must encode to at most 1024 bytes, got 1025');
  });

  it.each([
    ['below the minimum', 15],
    ['above the maximum', 65],
    ['not an integer', 32.5],
  ])('rejects a length %s', (_name, length) => {
    expect(() =>
      deriveSymmetricSecret(seedOf(0x01), { ...accountEncryption, length }),
    ).toThrow(
      `MIP-0015 secret length must be an integer in 16..64, got ${length}`,
    );
  });
});
