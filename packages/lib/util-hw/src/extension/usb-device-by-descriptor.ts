/// <reference types="w3c-web-usb" />
import type { DeviceDescriptor } from '../types';

export const getUsbDeviceByDescriptor = async (
  descriptor: DeviceDescriptor,
) => {
  if (descriptor.kind !== 'usb') {
    throw new Error('Expected USB device descriptor');
  }
  const { vendorId, productId } = descriptor;
  const devices = await navigator.usb.getDevices();
  const usbDevice = devices.find(
    d => d.vendorId === vendorId && d.productId === productId,
  );
  if (!usbDevice) {
    throw new Error('Pre-authorized USB device not found');
  }
  return usbDevice;
};
