/// <reference types="w3c-web-usb" />
import { canonicalUsbProductId, isSameDevice } from '../device-identity';

import type { DeviceDescriptor } from '../types';

const toUsbDescriptor = (device: USBDevice): DeviceDescriptor => ({
  kind: 'usb',
  vendorId: device.vendorId,
  productId: device.productId,
  serialNumber: device.serialNumber ?? null,
});

/**
 * Finds a pre-authorized USB device matching the descriptor. Prefers a full
 * identity match (including serial number) and falls back to vendor + model
 * so descriptors stored before serial numbers were reported keep resolving.
 */
export const getUsbDeviceByDescriptor = async (
  descriptor: DeviceDescriptor,
) => {
  if (descriptor.kind !== 'usb') {
    throw new Error('Expected USB device descriptor');
  }
  const { vendorId, productId } = descriptor;
  const devices = await navigator.usb.getDevices();
  const usbDevice =
    devices.find(d => isSameDevice(toUsbDescriptor(d), descriptor)) ??
    devices.find(
      d =>
        d.vendorId === vendorId &&
        canonicalUsbProductId(d.vendorId, d.productId) ===
          canonicalUsbProductId(vendorId, productId),
    );
  if (!usbDevice) {
    throw new Error('Pre-authorized USB device not found');
  }
  return usbDevice;
};
