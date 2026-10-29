import { describe, expect, it } from 'vitest';

import { GrantId, GrantIdError } from '../../src/value-objects';

describe('GrantId', () => {
  it('accepts a lowercase hex encoding of 32 bytes', () => {
    const hex = 'ab'.repeat(32);
    expect(GrantId(hex)).toBe(hex);
  });

  it('rejects fewer than 32 bytes', () => {
    expect(() => GrantId('ab'.repeat(16))).toThrow(GrantIdError);
  });

  it('rejects more than 32 bytes', () => {
    expect(() => GrantId('ab'.repeat(40))).toThrow(GrantIdError);
  });

  it('rejects uppercase hex', () => {
    expect(() => GrantId('AB'.repeat(32))).toThrow(GrantIdError);
  });

  it('rejects non-hex characters', () => {
    expect(() => GrantId('zz'.repeat(32))).toThrow(GrantIdError);
  });
});
