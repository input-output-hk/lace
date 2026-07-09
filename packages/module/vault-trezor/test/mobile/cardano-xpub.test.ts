import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TREZOR_USB_PRODUCT_ID, TREZOR_USB_VENDOR_ID } from '../../src/const';
import {
  TrezorMobileMissingDeviceIdError,
  getCardanoXpubViaDeepLink,
  walletIdFromTrezorDeviceId,
} from '../../src/mobile/cardano-xpub';

// Bip32PublicKeyHex requires exactly 128 hex characters (64 bytes).
const VALID_XPUB = 'a'.repeat(128);

const hoisted = vi.hoisted(() => ({
  cardanoGetPublicKey: vi.fn(),
}));

vi.mock('../../src/mobile/trezor-connect-bridge', () => ({
  getTrezorConnect: async () => ({
    cardanoGetPublicKey: hoisted.cardanoGetPublicKey,
  }),
}));

describe('walletIdFromTrezorDeviceId', () => {
  it('uses the Trezor Suite device id when available', () => {
    expect(walletIdFromTrezorDeviceId('suite-device-id')).toBe(
      `usb-hw-${TREZOR_USB_VENDOR_ID}-${TREZOR_USB_PRODUCT_ID}-suite-device-id`,
    );
  });
});

describe('getCardanoXpubViaDeepLink', () => {
  beforeEach(() => {
    hoisted.cardanoGetPublicKey.mockReset();
  });

  it('returns the public key and device_id on a successful deep-link round-trip', async () => {
    hoisted.cardanoGetPublicKey.mockResolvedValue({
      success: true,
      payload: { publicKey: VALID_XPUB },
      device: { features: { device_id: 'suite-device-id' } },
    });

    const result = await getCardanoXpubViaDeepLink(0);

    expect(result.publicKey).toBe(VALID_XPUB);
    expect(result.deviceId).toBe('suite-device-id');
  });

  it('throws when Suite returns a failure response', async () => {
    hoisted.cardanoGetPublicKey.mockResolvedValue({
      success: false,
      payload: { error: 'User cancelled' },
    });

    await expect(getCardanoXpubViaDeepLink(0)).rejects.toThrow(
      'Trezor cardanoGetPublicKey failed: User cancelled',
    );
  });

  it('throws when Suite omits device_id (would otherwise collide across devices)', async () => {
    hoisted.cardanoGetPublicKey.mockResolvedValue({
      success: true,
      payload: { publicKey: VALID_XPUB },
      device: { features: { device_id: null } },
    });

    await expect(getCardanoXpubViaDeepLink(0)).rejects.toThrow(
      TrezorMobileMissingDeviceIdError,
    );
  });

  it('throws when the response carries no device object', async () => {
    hoisted.cardanoGetPublicKey.mockResolvedValue({
      success: true,
      payload: { publicKey: VALID_XPUB },
    });

    await expect(getCardanoXpubViaDeepLink(0)).rejects.toThrow(
      TrezorMobileMissingDeviceIdError,
    );
  });

  it('builds the correct Cardano BIP-44 derivation path for the given account index', async () => {
    hoisted.cardanoGetPublicKey.mockResolvedValue({
      success: true,
      payload: { publicKey: VALID_XPUB },
      device: { features: { device_id: 'id' } },
    });

    await getCardanoXpubViaDeepLink(3);

    expect(hoisted.cardanoGetPublicKey).toHaveBeenCalledWith(
      expect.objectContaining({ path: "m/1852'/1815'/3'" }),
    );
  });

  it('passes the numeric derivation type to Trezor when derivationType is provided', async () => {
    hoisted.cardanoGetPublicKey.mockResolvedValue({
      success: true,
      payload: { publicKey: VALID_XPUB },
      device: { features: { device_id: 'id' } },
    });

    await getCardanoXpubViaDeepLink(0, 'ICARUS_TREZOR');

    expect(hoisted.cardanoGetPublicKey).toHaveBeenCalledWith(
      expect.objectContaining({ derivationType: 2 }),
    );
  });

  it('passes undefined derivationType to Trezor when derivationType is omitted', async () => {
    hoisted.cardanoGetPublicKey.mockResolvedValue({
      success: true,
      payload: { publicKey: VALID_XPUB },
      device: { features: { device_id: 'id' } },
    });

    await getCardanoXpubViaDeepLink(0);

    expect(hoisted.cardanoGetPublicKey).toHaveBeenCalledWith(
      expect.objectContaining({ derivationType: undefined }),
    );
  });
});
