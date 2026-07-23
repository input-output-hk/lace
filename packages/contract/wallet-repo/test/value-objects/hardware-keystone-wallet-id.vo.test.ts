import { describe, expect, it } from 'vitest';

import { HardwareKeystoneWalletId } from '../../src/value-objects/hardware-keystone-wallet-id.vo';

describe('HardwareKeystoneWalletId', () => {
  it('derives a stable id from an 8 hex character master fingerprint', () => {
    expect(HardwareKeystoneWalletId('deadbeef')).toBe('keystone-deadbeef');
  });

  it('lowercases the fingerprint', () => {
    expect(HardwareKeystoneWalletId('DEADBEEF')).toBe('keystone-deadbeef');
  });

  it('is stable for the same fingerprint (one device -> one wallet)', () => {
    expect(HardwareKeystoneWalletId('0a0b0c0d')).toBe(
      HardwareKeystoneWalletId('0a0b0c0d'),
    );
  });

  it('rejects a fingerprint that is not 8 hex characters', () => {
    expect(() => HardwareKeystoneWalletId('dead')).toThrow();
    expect(() => HardwareKeystoneWalletId('deadbeeff')).toThrow();
    expect(() => HardwareKeystoneWalletId('zzzzzzzz')).toThrow();
  });
});
