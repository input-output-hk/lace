import { describe, it, expect } from 'vitest';

import { isDuplicateString } from '../src/utils/isDuplicateString';

describe('isDuplicateString', () => {
  it('returns false for empty name', () => {
    expect(isDuplicateString('', ['Wallet 1'])).toBe(false);
  });

  it('returns false for whitespace-only name', () => {
    expect(isDuplicateString('   ', ['Wallet 1'])).toBe(false);
  });

  it('returns true for exact match', () => {
    expect(isDuplicateString('Wallet 1', ['Wallet 1', 'Wallet 2'])).toBe(true);
  });

  it('returns false when no match exists', () => {
    expect(isDuplicateString('Wallet 3', ['Wallet 1', 'Wallet 2'])).toBe(false);
  });

  it('matches case-insensitively', () => {
    expect(isDuplicateString('wallet 1', ['Wallet 1'])).toBe(true);
    expect(isDuplicateString('WALLET 1', ['wallet 1'])).toBe(true);
  });

  it('trims input before comparing', () => {
    expect(isDuplicateString('  Wallet 1  ', ['Wallet 1'])).toBe(true);
  });

  it('trims existing names before comparing', () => {
    expect(isDuplicateString('Wallet 1', ['  Wallet 1  '])).toBe(true);
  });

  it('returns false for empty existing names list', () => {
    expect(isDuplicateString('Wallet 1', [])).toBe(false);
  });

  describe('with excludeValue', () => {
    it('excludes the specified value from comparison', () => {
      expect(
        isDuplicateString('Wallet 1', ['Wallet 1', 'Wallet 2'], 'Wallet 1'),
      ).toBe(false);
    });

    it('still detects duplicates against non-excluded values', () => {
      expect(
        isDuplicateString('Wallet 2', ['Wallet 1', 'Wallet 2'], 'Wallet 1'),
      ).toBe(true);
    });

    it('excludes case-insensitively', () => {
      expect(isDuplicateString('wallet 1', ['Wallet 1'], 'WALLET 1')).toBe(
        false,
      );
    });

    it('trims excludeValue before comparing', () => {
      expect(isDuplicateString('Wallet 1', ['Wallet 1'], '  Wallet 1  ')).toBe(
        false,
      );
    });
  });
});
