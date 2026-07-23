import type { DeviceDescriptor } from './types';

const LEDGER_USB_VENDOR_ID = 0x2c_97;

/**
 * Stable USB product identity. Ledger encodes the model in the high byte and
 * app/firmware-dependent interface flags in the low byte, so the same device
 * can report different productIds across firmware updates or open apps.
 * Masks the flag bits for Ledger (mirrors @ledgerhq/devices, which resolves
 * models via `productId >> 8`); other vendors keep the full productId.
 */
export const canonicalUsbProductId = (
  vendorId: number,
  productId: number,
): number =>
  vendorId === LEDGER_USB_VENDOR_ID ? productId & 0xff_00 : productId;

/** True when both descriptors identify the same physical device. */
export const isSameDevice = (
  a: DeviceDescriptor,
  b: DeviceDescriptor,
): boolean => {
  if (a.kind === 'usb' && b.kind === 'usb') {
    return (
      a.vendorId === b.vendorId &&
      canonicalUsbProductId(a.vendorId, a.productId) ===
        canonicalUsbProductId(b.vendorId, b.productId) &&
      (a.serialNumber ?? null) === (b.serialNumber ?? null)
    );
  }
  if (a.kind === 'ble' && b.kind === 'ble') {
    return a.vendorName === b.vendorName && a.id === b.id;
  }
  return false;
};
