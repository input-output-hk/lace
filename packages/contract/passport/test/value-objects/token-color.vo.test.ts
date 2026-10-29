import { describe, expect, it } from 'vitest';

import { TokenColor, TokenColorError } from '../../src/value-objects';

describe('TokenColor', () => {
  it('accepts a lowercase hex encoding of 32 bytes', () => {
    const hex = 'ab'.repeat(32);
    expect(TokenColor(hex)).toBe(hex);
  });

  it('rejects fewer than 32 bytes', () => {
    expect(() => TokenColor('ab'.repeat(16))).toThrow(TokenColorError);
  });

  it('rejects more than 32 bytes', () => {
    expect(() => TokenColor('ab'.repeat(40))).toThrow(TokenColorError);
  });

  it('rejects uppercase hex', () => {
    expect(() => TokenColor('AB'.repeat(32))).toThrow(TokenColorError);
  });

  it('rejects non-hex characters', () => {
    expect(() => TokenColor('zz'.repeat(32))).toThrow(TokenColorError);
  });
});
