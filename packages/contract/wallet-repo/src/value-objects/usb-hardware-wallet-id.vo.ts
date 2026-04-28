import type { WalletId } from './wallet-id.vo';
import type { DeviceDescriptor } from '@lace-lib/util-hw';
import type { Tagged } from 'type-fest';

/**
 * Wallet ID for USB-connected hardware wallets, derived from the physical
 * device descriptor. Allows the same device to be identified across sessions
 * without retrieving blockchain keys.
 */
export type UsbHardwareWalletId = Tagged<WalletId, 'UsbHardwareWalletId'>;
export const UsbHardwareWalletId = ({
  vendorId,
  productId,
  serialNumber,
}: DeviceDescriptor): UsbHardwareWalletId =>
  `usb-hw-${vendorId}-${productId}-${
    serialNumber ?? `no-serial-${Date.now() % 10000000}`
  }` as UsbHardwareWalletId;
