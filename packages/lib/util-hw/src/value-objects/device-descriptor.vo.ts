/** Identifies a physical USB device by vendor/product ID and serial number. */
export interface DeviceDescriptor {
  vendorId: number;
  productId: number;
  serialNumber: string | null;
}

const USB_HW_PATTERN = /^usb-hw-(\d+)-(\d+)-(.+)$/;

export const DeviceDescriptor = {
  /**
   * Reconstruct a DeviceDescriptor from a UsbHardwareWalletId string.
   * Format: `usb-hw-{vendorId}-{productId}-{serialOrFallback}`
   * Returns null when the string doesn't match.
   */
  parse: (walletId: string): DeviceDescriptor | null => {
    const match = USB_HW_PATTERN.exec(walletId);
    if (!match) return null;

    const vendorId = Number(match[1]);
    const productId = Number(match[2]);
    const serialSegment = match[3];

    return {
      vendorId,
      productId,
      serialNumber: serialSegment.startsWith('no-serial-')
        ? null
        : serialSegment,
    };
  },
};
