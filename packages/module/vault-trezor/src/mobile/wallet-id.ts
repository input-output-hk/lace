import { HardwareWalletId } from '@lace-contract/wallet-repo';

import { TREZOR_USB_PRODUCT_ID, TREZOR_USB_VENDOR_ID } from '../const';

import type { WalletId } from '@lace-contract/wallet-repo';

/**
 * Wallet id for a Trezor reached through Trezor Suite, keyed by a seed identity
 * that each blockchain derives from the keys it already exports.
 *
 * Mobile has no USB access, so the device cannot be identified from a
 * descriptor the way the extension does — discovery reports a constant
 * placeholder serial that would collide across devices. Suite's `device_id` is
 * not used in its place: it costs a dedicated deep-link round-trip per wallet
 * creation, and it is shared by every passphrase of one device, which would
 * merge unrelated hidden wallets into a single id.
 *
 * The USB shape is kept so `HardwareWalletId.parse` keeps resolving a
 * descriptor for these wallets — account management needs one to add accounts.
 */
export const trezorMobileWalletId = (seedIdentity: string): WalletId =>
  HardwareWalletId({
    kind: 'usb',
    vendorId: TREZOR_USB_VENDOR_ID,
    productId: TREZOR_USB_PRODUCT_ID,
    serialNumber: seedIdentity,
  });
