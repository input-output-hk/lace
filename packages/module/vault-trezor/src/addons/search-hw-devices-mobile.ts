import { of } from 'rxjs';

import {
  TREZOR_MOBILE_PLACEHOLDER_SERIAL,
  TREZOR_USB_PRODUCT_ID,
  TREZOR_USB_VENDOR_ID,
} from '../const';

import type { SearchHWDevices } from '@lace-lib/util-hw';

const loadSearchHwDevicesMobile = (): SearchHWDevices => () => ({
  results$: of([
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
  ]),
  stop: () => undefined,
});

export default loadSearchHwDevicesMobile;
