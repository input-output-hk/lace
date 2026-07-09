import { describe, expect, it } from 'vitest';

import { HardwareWalletId } from '../../src/value-objects/hardware-wallet-id.vo';

describe('HardwareWalletId.parse', () => {
  it('parses a valid Ledger USB wallet ID', () => {
    expect(
      HardwareWalletId.parse('usb-hw-11415-4117-0001000000000001'),
    ).toEqual({
      kind: 'usb',
      vendorId: 11_415,
      productId: 4117,
      serialNumber: '0001000000000001',
    });
  });

  it('parses a valid Trezor USB wallet ID', () => {
    expect(HardwareWalletId.parse('usb-hw-4617-21441-ABC123DEF456')).toEqual({
      kind: 'usb',
      vendorId: 4617,
      productId: 21_441,
      serialNumber: 'ABC123DEF456',
    });
  });

  it('returns null serialNumber for no-serial sentinel', () => {
    expect(HardwareWalletId.parse('usb-hw-11415-4117-no-serial')).toEqual({
      kind: 'usb',
      vendorId: 11_415,
      productId: 4117,
      serialNumber: null,
    });
  });

  it('parses a valid Ledger BLE wallet ID', () => {
    expect(HardwareWalletId.parse('ble-ledger-AA:BB:CC:DD:EE:FF')).toEqual({
      kind: 'ble',
      vendorName: 'ledger',
      id: 'AA:BB:CC:DD:EE:FF',
      name: null,
    });
  });

  it('parses a Ledger BLE wallet ID with UUID-shaped id', () => {
    expect(
      HardwareWalletId.parse('ble-ledger-12345678-1234-1234-1234-123456789ABC'),
    ).toEqual({
      kind: 'ble',
      vendorName: 'ledger',
      id: '12345678-1234-1234-1234-123456789ABC',
      name: null,
    });
  });

  it('returns null for invalid prefix', () => {
    expect(HardwareWalletId.parse('hw-11415-4117-serial')).toBeNull();
    expect(HardwareWalletId.parse('usb-11415-4117-serial')).toBeNull();
  });

  it('returns null for unknown BLE vendor names', () => {
    expect(HardwareWalletId.parse('ble-coldcard-AA:BB:CC')).toBeNull();
  });

  it('returns null for malformed strings', () => {
    expect(HardwareWalletId.parse('usb-hw-abc-4117-serial')).toBeNull();
    expect(HardwareWalletId.parse('usb-hw-11415-def-serial')).toBeNull();
    expect(HardwareWalletId.parse('usb-hw-11415-4117')).toBeNull();
    expect(HardwareWalletId.parse('')).toBeNull();
  });
});
