import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import loadSearchHwDevicesMobile from '../../src/addons/search-hw-devices-mobile';
import {
  TREZOR_MOBILE_PLACEHOLDER_SERIAL,
  TREZOR_USB_PRODUCT_ID,
  TREZOR_USB_VENDOR_ID,
} from '../../src/const';

describe('loadSearchHwDevicesMobile', () => {
  it('emits a selectable Trezor placeholder without scanning BLE', async () => {
    const search = loadSearchHwDevicesMobile();
    const handle = search();

    await expect(firstValueFrom(handle.results$)).resolves.toEqual([
      {
        deviceDescriptor: {
          kind: 'usb',
          vendorId: TREZOR_USB_VENDOR_ID,
          productId: TREZOR_USB_PRODUCT_ID,
          serialNumber: TREZOR_MOBILE_PLACEHOLDER_SERIAL,
        },
        displayName: 'Trezor',
        icon: 'UsbMemory',
      },
    ]);

    handle.stop();
  });
});
