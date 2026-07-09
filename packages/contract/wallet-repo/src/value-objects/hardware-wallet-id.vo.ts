import type { WalletId } from './wallet-id.vo';
import type { DeviceDescriptor, HardwareVendorName } from '@lace-lib/util-hw';
import type { Tagged } from 'type-fest';

const USB_HW_PATTERN = /^usb-hw-(\d+)-(\d+)-(.+)$/;
const BLE_HW_PATTERN = /^ble-(ledger|trezor)-(.+)$/;

const USB_NO_SERIAL_SENTINEL = 'no-serial';

/**
 * Wallet ID for hardware wallets, derived from the physical device descriptor.
 * USB IDs use `usb-hw-{vid}-{pid}-{serial}`, while BLE use `ble-{vendor}-{id}`.
 */
export type HardwareWalletId = Tagged<WalletId, 'HardwareWalletId'>;
export const HardwareWalletId = (
  descriptor: DeviceDescriptor,
): HardwareWalletId => {
  switch (descriptor.kind) {
    case 'usb':
      return `usb-hw-${descriptor.vendorId}-${descriptor.productId}-${
        descriptor.serialNumber ?? USB_NO_SERIAL_SENTINEL
      }` as HardwareWalletId;
    case 'ble':
      return `ble-${descriptor.vendorName}-${descriptor.id}` as HardwareWalletId;
  }
};
HardwareWalletId.parse = (walletId: string): DeviceDescriptor | null => {
  const usbMatch = USB_HW_PATTERN.exec(walletId);
  if (usbMatch) {
    const serialSegment = usbMatch[3];
    return {
      kind: 'usb',
      vendorId: Number(usbMatch[1]),
      productId: Number(usbMatch[2]),
      serialNumber:
        serialSegment === USB_NO_SERIAL_SENTINEL ? null : serialSegment,
    };
  }
  const bleMatch = BLE_HW_PATTERN.exec(walletId);
  if (bleMatch) {
    return {
      kind: 'ble',
      vendorName: bleMatch[1] as HardwareVendorName,
      id: bleMatch[2],
      name: null,
    };
  }
  return null;
};
