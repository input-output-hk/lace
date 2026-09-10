import { describe, expect, it } from 'vitest';

import { TREZOR_USB_PRODUCT_ID, TREZOR_USB_VENDOR_ID } from '../../src/const';
import { trezorMobileWalletId } from '../../src/mobile/wallet-id';

describe('trezorMobileWalletId', () => {
  it('encodes the seed identity as the serial of a USB hardware wallet id', () => {
    expect(trezorMobileWalletId('deadbeef')).toBe(
      `usb-hw-${TREZOR_USB_VENDOR_ID}-${TREZOR_USB_PRODUCT_ID}-deadbeef`,
    );
  });

  it('gives different seeds different wallet ids', () => {
    expect(trezorMobileWalletId('deadbeef')).not.toBe(
      trezorMobileWalletId('feedface'),
    );
  });
});
