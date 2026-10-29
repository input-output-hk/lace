import { EntropyHex } from '../src/value-objects/entropy-hex.vo';

describe('EntropyHex', () => {
  it('accepts 64 lowercase hex characters', () => {
    const value = 'a'.repeat(64);

    expect(EntropyHex(value)).toBe(value);
  });

  it('accepts 64 uppercase hex characters', () => {
    const value = 'AB'.repeat(32);

    expect(EntropyHex(value)).toBe(value);
  });

  it('accepts a mix of lowercase and uppercase hex characters', () => {
    const value = 'aB'.repeat(32);

    expect(EntropyHex(value)).toBe(value);
  });

  it('rejects a string shorter than 64 characters', () => {
    expect(() => EntropyHex('a'.repeat(63))).toThrow(
      'EntropyHex must be 32 bytes (64 hex characters), got 63',
    );
  });

  it('rejects a string longer than 64 characters', () => {
    expect(() => EntropyHex('a'.repeat(65))).toThrow(
      'EntropyHex must be 32 bytes (64 hex characters), got 65',
    );
  });

  it('rejects non-hex characters', () => {
    expect(() => EntropyHex('g'.repeat(64))).toThrow(
      'EntropyHex must be a hex-encoded string',
    );
  });

  it('rejects an empty string', () => {
    expect(() => EntropyHex('')).toThrow(
      'EntropyHex must be 32 bytes (64 hex characters), got 0',
    );
  });
});
