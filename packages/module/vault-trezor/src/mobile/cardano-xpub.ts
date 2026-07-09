import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import { HardwareWalletId } from '@lace-contract/wallet-repo';

import { TREZOR_USB_PRODUCT_ID, TREZOR_USB_VENDOR_ID } from '../const';

import { toTrezorDerivationType } from './derivation-type';
import { getTrezorConnect } from './trezor-connect-bridge';

import type { DerivationType } from '@lace-contract/onboarding-v2';
import type { WalletId } from '@lace-contract/wallet-repo';

export class TrezorMobileMissingDeviceIdError extends Error {
  public constructor() {
    super(
      'Trezor Suite did not return a device id. Update Trezor Suite and retry.',
    );
    this.name = 'TrezorMobileMissingDeviceIdError';
  }
}

const CARDANO_PURPOSE_PATH = "1852'";
const CARDANO_COIN_TYPE_PATH = "1815'";

const cardanoDerivationPath = (accountIndex: number) =>
  `m/${CARDANO_PURPOSE_PATH}/${CARDANO_COIN_TYPE_PATH}/${accountIndex}'`;

export interface CardanoXpubResult {
  publicKey: Bip32PublicKeyHex;
  deviceId: string;
}

/**
 * Mobile must derive a stable, unique wallet id per physical Trezor. A missing
 * `device_id` would otherwise force a constant placeholder serial that collides
 * across devices (silently merging accounts), so the helper fails loudly here
 * — at the only place that has the raw Suite response — rather than letting an
 * `undefined` propagate through the call chain.
 */
export const getCardanoXpubViaDeepLink = async (
  accountIndex: number,
  derivationType?: DerivationType,
): Promise<CardanoXpubResult> => {
  const trezor = await getTrezorConnect();

  const result = await trezor.cardanoGetPublicKey({
    path: cardanoDerivationPath(accountIndex),
    showOnTrezor: false,
    derivationType: toTrezorDerivationType(derivationType),
  });

  if (!result.success) {
    throw new Error(
      `Trezor cardanoGetPublicKey failed: ${result.payload.error}`,
    );
  }

  const device = result.device as
    | { features?: { device_id?: string | null } }
    | undefined;
  const deviceId = device?.features?.device_id;
  if (!deviceId) throw new TrezorMobileMissingDeviceIdError();

  return {
    publicKey: Bip32PublicKeyHex(result.payload.publicKey),
    deviceId,
  };
};

export const walletIdFromTrezorDeviceId = (deviceId: string): WalletId =>
  HardwareWalletId({
    kind: 'usb',
    vendorId: TREZOR_USB_VENDOR_ID,
    productId: TREZOR_USB_PRODUCT_ID,
    serialNumber: deviceId,
  });
