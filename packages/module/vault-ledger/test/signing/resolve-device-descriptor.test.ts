import { WalletId } from '@lace-contract/wallet-repo';
import { describe, expect, it, vi } from 'vitest';

import { resolveLedgerDeviceDescriptor } from '../../src/signing/resolve-device-descriptor';

import type { DeviceDescriptor } from '@lace-lib/util-hw';

const v2WalletId = WalletId('usb-hw-11415-4117-abc123');
const legacyWalletId = WalletId('a1b2c3d4e5f6legacyhash');

const legacyDevice: DeviceDescriptor = {
  kind: 'usb',
  vendorId: 11415,
  productId: 4117,
  serialNumber: 'scanned-serial',
};

describe('resolveLedgerDeviceDescriptor', () => {
  it('parses the descriptor from a v2 device-descriptor walletId without scanning', async () => {
    const resolveLegacyDevice = vi.fn();

    const descriptor = await resolveLedgerDeviceDescriptor(
      v2WalletId,
      resolveLegacyDevice,
    );

    expect(descriptor).toEqual({
      kind: 'usb',
      vendorId: 11415,
      productId: 4117,
      serialNumber: 'abc123',
    });
    expect(resolveLegacyDevice).not.toHaveBeenCalled();
  });

  it('falls back to the legacy resolver for a migrated (legacy hash) walletId', async () => {
    const resolveLegacyDevice = vi.fn().mockResolvedValue(legacyDevice);

    const descriptor = await resolveLedgerDeviceDescriptor(
      legacyWalletId,
      resolveLegacyDevice,
    );

    expect(descriptor).toBe(legacyDevice);
    expect(resolveLegacyDevice).toHaveBeenCalledTimes(1);
  });

  it('throws for a legacy walletId when no resolver is provided', async () => {
    await expect(resolveLedgerDeviceDescriptor(legacyWalletId)).rejects.toThrow(
      /Cannot derive device descriptor/,
    );
  });

  it('propagates the resolver error when the device cannot be found', async () => {
    const resolveLegacyDevice = vi
      .fn()
      .mockRejectedValue(
        new Error('Ledger device disconnected or not authorized'),
      );

    await expect(
      resolveLedgerDeviceDescriptor(legacyWalletId, resolveLegacyDevice),
    ).rejects.toThrow(/disconnected or not authorized/);
  });
});
