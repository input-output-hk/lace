import { describe, expect, it } from 'vitest';

import { MasterFingerprint } from '../../src';

describe('value-objects/master-fingerprint', () => {
  it('wraps a valid 8-character hex string', () => {
    expect(MasterFingerprint('1a2b3c4d')).toBe('1a2b3c4d');
  });

  it('normalizes uppercase hex to lowercase', () => {
    expect(MasterFingerprint('AABBCCDD')).toBe('aabbccdd');
  });

  it('throws when the value is not 8 hex characters', () => {
    expect(() => MasterFingerprint('1a2b3c')).toThrow();
    expect(() => MasterFingerprint('1a2b3c4d5e')).toThrow();
  });

  it('throws when the value contains non-hex characters', () => {
    expect(() => MasterFingerprint('zzzzzzzz')).toThrow();
  });
});
