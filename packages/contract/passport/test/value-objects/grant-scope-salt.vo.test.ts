import { describe, expect, it } from 'vitest';

import { GrantScopeSalt, GrantScopeSaltError } from '../../src/value-objects';

describe('GrantScopeSalt', () => {
  it('accepts a lowercase hex encoding of 32 bytes', () => {
    const hex = 'ab'.repeat(32);
    expect(GrantScopeSalt(hex)).toBe(hex);
  });

  it('rejects fewer than 32 bytes', () => {
    expect(() => GrantScopeSalt('ab'.repeat(16))).toThrow(GrantScopeSaltError);
  });

  it('rejects more than 32 bytes', () => {
    expect(() => GrantScopeSalt('ab'.repeat(40))).toThrow(GrantScopeSaltError);
  });

  it('rejects uppercase hex', () => {
    expect(() => GrantScopeSalt('AB'.repeat(32))).toThrow(GrantScopeSaltError);
  });

  it('rejects non-hex characters', () => {
    expect(() => GrantScopeSalt('zz'.repeat(32))).toThrow(GrantScopeSaltError);
  });
});
