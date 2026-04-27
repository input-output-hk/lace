import { describe, expect, it } from 'vitest';

import { DeviceDescriptor } from '../../src/value-objects/device-descriptor.vo';

describe('DeviceDescriptor.parse', () => {
  it('parses a valid Ledger wallet ID', () => {
    expect(
      DeviceDescriptor.parse('usb-hw-11415-4117-0001000000000001'),
    ).toEqual({
      vendorId: 11_415,
      productId: 4117,
      serialNumber: '0001000000000001',
    });
  });

  it('parses a valid Trezor wallet ID', () => {
    expect(DeviceDescriptor.parse('usb-hw-4617-21441-ABC123DEF456')).toEqual({
      vendorId: 4617,
      productId: 21_441,
      serialNumber: 'ABC123DEF456',
    });
  });

  it('returns null serialNumber for no-serial prefix', () => {
    expect(
      DeviceDescriptor.parse('usb-hw-11415-4117-no-serial-1234567'),
    ).toEqual({
      vendorId: 11_415,
      productId: 4117,
      serialNumber: null,
    });
  });

  it('returns null for invalid prefix', () => {
    expect(DeviceDescriptor.parse('hw-11415-4117-serial')).toBeNull();
    expect(DeviceDescriptor.parse('usb-11415-4117-serial')).toBeNull();
  });

  it('returns null for malformed strings', () => {
    expect(DeviceDescriptor.parse('usb-hw-abc-4117-serial')).toBeNull();
    expect(DeviceDescriptor.parse('usb-hw-11415-def-serial')).toBeNull();
    expect(DeviceDescriptor.parse('usb-hw-11415-4117')).toBeNull();
    expect(DeviceDescriptor.parse('')).toBeNull();
  });
});
