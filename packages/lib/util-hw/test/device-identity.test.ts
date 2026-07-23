import { describe, expect, it } from 'vitest';

import { canonicalUsbProductId, isSameDevice } from '../src/device-identity';

import type { DeviceDescriptor } from '../src/types';

const LEDGER_VENDOR = 0x2c_97;

const usb = (
  vendorId: number,
  productId: number,
  serialNumber: string | null = '0001',
): DeviceDescriptor => ({ kind: 'usb', vendorId, productId, serialNumber });

describe('canonicalUsbProductId', () => {
  it('masks the interface bits for Ledger vendor', () => {
    expect(canonicalUsbProductId(LEDGER_VENDOR, 0x40_15)).toBe(0x40_00);
    expect(canonicalUsbProductId(LEDGER_VENDOR, 0x40_11)).toBe(0x40_00);
  });

  it('keeps the full productId for other vendors', () => {
    expect(canonicalUsbProductId(0x12_09, 0x53_c1)).toBe(0x53_c1);
  });
});

describe('isSameDevice', () => {
  it('matches Ledger descriptors whose interface bits differ', () => {
    expect(
      isSameDevice(usb(LEDGER_VENDOR, 0x40_15), usb(LEDGER_VENDOR, 0x40_11)),
    ).toBe(true);
  });

  it('rejects Ledger descriptors of different models', () => {
    expect(
      isSameDevice(usb(LEDGER_VENDOR, 0x40_15), usb(LEDGER_VENDOR, 0x50_15)),
    ).toBe(false);
  });

  it('rejects different serial numbers', () => {
    expect(
      isSameDevice(
        usb(LEDGER_VENDOR, 0x40_15, '0001'),
        usb(LEDGER_VENDOR, 0x40_15, '0002'),
      ),
    ).toBe(false);
  });

  it('treats missing serial numbers as equal', () => {
    expect(
      isSameDevice(
        usb(LEDGER_VENDOR, 0x40_15, null),
        usb(LEDGER_VENDOR, 0x40_15, null),
      ),
    ).toBe(true);
  });

  it('requires exact productId for non-Ledger vendors', () => {
    expect(isSameDevice(usb(0x12_09, 0x53_c1), usb(0x12_09, 0x53_c0))).toBe(
      false,
    );
  });

  it('matches BLE descriptors by vendor and id', () => {
    expect(
      isSameDevice(
        { kind: 'ble', vendorName: 'ledger', id: 'AA', name: null },
        { kind: 'ble', vendorName: 'ledger', id: 'AA', name: 'Nano X' },
      ),
    ).toBe(true);
  });

  it('rejects descriptors of different kinds', () => {
    expect(
      isSameDevice(usb(LEDGER_VENDOR, 0x40_15), {
        kind: 'ble',
        vendorName: 'ledger',
        id: 'AA',
        name: null,
      }),
    ).toBe(false);
  });
});
