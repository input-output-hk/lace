import { describe, expect, it } from 'vitest';

import { HardwareSeedSignerWalletId } from '../../src/value-objects/hardware-seed-signer-wallet-id.vo';

describe('HardwareSeedSignerWalletId', () => {
  it('derives a stable id from an 8 hex character master fingerprint', () => {
    expect(HardwareSeedSignerWalletId('deadbeef')).toBe('seed-signer-deadbeef');
  });

  it('lowercases the fingerprint', () => {
    expect(HardwareSeedSignerWalletId('DEADBEEF')).toBe('seed-signer-deadbeef');
  });

  it('is stable for the same fingerprint (one device -> one wallet)', () => {
    expect(HardwareSeedSignerWalletId('0a0b0c0d')).toBe(
      HardwareSeedSignerWalletId('0a0b0c0d'),
    );
  });

  it('rejects a fingerprint that is not 8 hex characters', () => {
    expect(() => HardwareSeedSignerWalletId('dead')).toThrow();
    expect(() => HardwareSeedSignerWalletId('deadbeeff')).toThrow();
    expect(() => HardwareSeedSignerWalletId('zzzzzzzz')).toThrow();
  });
});
