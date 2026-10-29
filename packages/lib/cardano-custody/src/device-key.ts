import * as Crypto from '@cardano-sdk/crypto';

import { fail, ok } from './result';

import type { CustodyResult } from './result';

/**
 * The CIP-1854 path `m/1854'/1815'/a'/0/i` of custody device and creator
 * keys. The account index `a` belongs to the contract version and network:
 * `custodyDeviceAccountIndex` gives it.
 */
export const CUSTODY_DEVICE_KEY_PATH = {
  purpose: 1854,
  coinType: 1815,
  role: 0,
} as const;

/**
 * Unregistered creator indices after the last account found at which
 * creator recovery stops: the CIP-1854 address gap. An index someone else
 * registered first neither counts toward the gap nor resets it.
 */
export const CUSTODY_CREATOR_INDEX_GAP = 20;

/** First index that is a hardened derivation; device keys use soft ones only. */
const HARDENED_INDEX = 0x80_00_00_00;

export interface CustodyDeviceKey {
  readonly index: number;
  readonly publicKey: Crypto.Ed25519PublicKeyHex;
  /** BLAKE2b-224 of the public key: what the account datum lists. */
  readonly keyHash: Crypto.Ed25519KeyHashHex;
}

type CustodyDeviceKeyError =
  | { readonly code: 'invalid-account-public-key' }
  | { readonly code: 'invalid-device-index'; readonly index: number };

/**
 * The device key at `m/1854'/1815'/a'/0/index`, derived from the CIP-1854
 * account extended public key of account `a` by soft derivation, so no
 * secret is needed.
 */
export const deriveCustodyDeviceKey = async (
  accountPublicKey: Crypto.Bip32PublicKeyHex,
  index: number,
): Promise<CustodyResult<CustodyDeviceKey, CustodyDeviceKeyError>> => {
  if (!Number.isInteger(index) || index < 0 || index >= HARDENED_INDEX) {
    return fail({ code: 'invalid-device-index', index });
  }
  await Crypto.ready();
  try {
    const publicKey = Crypto.Bip32PublicKey.fromHex(accountPublicKey)
      .derive([CUSTODY_DEVICE_KEY_PATH.role, index])
      .toRawKey();
    return ok({
      index,
      publicKey: publicKey.hex(),
      keyHash: publicKey.hash().hex(),
    });
  } catch {
    return fail({ code: 'invalid-account-public-key' });
  }
};

/**
 * A short form of a device key hash for people to compare across devices:
 * its first and last 8 hex characters.
 */
export const custodyDeviceFingerprint = (
  keyHash: Crypto.Ed25519KeyHashHex,
): string => `${keyHash.slice(0, 8)}…${keyHash.slice(-8)}`;
