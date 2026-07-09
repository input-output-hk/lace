import { ledgerUSBVendorId } from '@ledgerhq/devices';

import type { DeviceDescriptor } from '@lace-lib/util-hw';

/**
 * Resolve a pre-authorized Ledger USB device for v1 wallets whose IDs lack
 * device info (migrated from Lace v1, which never stored vid/pid/serial).
 *
 * NOTE: this always picks the FIRST connected Ledger by vendor id and does not
 * match the account's keys, so when multiple different Ledger devices are
 * connected, signing may run against the wrong one. A wrong device cannot forge
 * valid witnesses for the account (the result is an invalid signature, not lost
 * funds), but it is a known limitation: affected users should connect only the
 * Ledger that created the wallet. A clean fix needs interactive device
 * selection plus xpub verification, which is not yet implemented.
 */
export const resolveLegacyDevice = async (): Promise<DeviceDescriptor> => {
  const usbDevices = await navigator.usb.getDevices();
  const device = usbDevices.find(d => d.vendorId === ledgerUSBVendorId);
  if (!device) throw new Error('Ledger device disconnected or not authorized');
  return {
    kind: 'usb',
    vendorId: device.vendorId,
    productId: device.productId,
    serialNumber: device.serialNumber ?? null,
  };
};
