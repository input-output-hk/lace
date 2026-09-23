import { describe, expect, it } from 'vitest';

import {
  DeviceCommitmentHex,
  DeviceCommitmentHexError,
} from '../../src/value-objects';

describe('DeviceCommitmentHex', () => {
  it('accepts a lowercase hex encoding of 32 bytes', () => {
    const hex = 'ab'.repeat(32);
    expect(DeviceCommitmentHex(hex)).toBe(hex);
  });

  it('rejects fewer than 32 bytes', () => {
    expect(() => DeviceCommitmentHex('ab'.repeat(16))).toThrow(
      DeviceCommitmentHexError,
    );
  });

  it('rejects more than 32 bytes', () => {
    expect(() => DeviceCommitmentHex('ab'.repeat(40))).toThrow(
      DeviceCommitmentHexError,
    );
  });

  it('rejects uppercase hex', () => {
    expect(() => DeviceCommitmentHex('AB'.repeat(32))).toThrow(
      DeviceCommitmentHexError,
    );
  });

  it('rejects non-hex characters', () => {
    expect(() => DeviceCommitmentHex('zz'.repeat(32))).toThrow(
      DeviceCommitmentHexError,
    );
  });
});
