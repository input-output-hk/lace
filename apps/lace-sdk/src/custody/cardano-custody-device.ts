import {
  custodyDeviceFingerprint,
  deriveCustodyDeviceKey,
} from '@lace-lib/cardano-custody';

import { CardanoCustodyEnrollmentInvalidError } from './cardano-custody-errors';

import type { Cardano } from '@cardano-sdk/core';
import type {
  Bip32PublicKeyHex,
  Ed25519KeyHashHex,
  Ed25519PublicKeyHex,
} from '@cardano-sdk/crypto';
import type { CardanoCustodyDeviceChannel } from '@lace-contract/cardano-context';

/**
 * One custody device key, `m/1854'/1815'/a'/0/index` (CIP-1854). Its key
 * hash is what an account state lists; the fingerprint is a short form of it
 * for people to compare across two signer screens.
 */
export type CardanoCustodyDevice = {
  index: number;
  keyHash: Ed25519KeyHashHex;
  publicKey: Ed25519PublicKeyHex;
  fingerprint: string;
};

/**
 * A passkey's custody device keys on one network: the CIP-1854 account
 * extended public key `m/1854'/1815'/a'`, where `a` belongs to the network
 * (0 for Mainnet, 1 for every testnet), and the channel that signs with them.
 * Every field is public; persist it to create, recover or join accounts
 * later. `device` is key 0: the key a device joins existing accounts with.
 */
export type CardanoCustodyDeviceKey = {
  extendedAccountPublicKey: Bip32PublicKeyHex;
  networkMagic: Cardano.NetworkMagic;
  channel: CardanoCustodyDeviceChannel;
  device: CardanoCustodyDevice;
};

/**
 * Derives the device key at `index` from a CIP-1854 account extended public
 * key, without any secret.
 *
 * @param extendedAccountPublicKey - The CIP-1854 account key, from
 *   `requestCardanoCustodyDeviceKey`.
 * @param index - A soft derivation index; `0` is the key a device joins
 *   accounts with.
 * @returns The device's index, key hash, public key and fingerprint.
 * @throws `RangeError` When `index` is not a soft derivation index.
 * @throws `TypeError` When `extendedAccountPublicKey` is not a BIP-32 public key.
 */
export const deriveCardanoCustodyDevice = async (
  extendedAccountPublicKey: Bip32PublicKeyHex,
  index: number,
): Promise<CardanoCustodyDevice> => {
  const derived = await deriveCustodyDeviceKey(extendedAccountPublicKey, index);
  if (!derived.ok) {
    throw derived.error.code === 'invalid-device-index'
      ? new RangeError(
          `Custody device index must be a soft derivation index, got ${index}`,
        )
      : new TypeError('Invalid custody account extended public key');
  }
  return {
    ...derived.value,
    fingerprint: custodyDeviceFingerprint(derived.value.keyHash),
  };
};

const CARDANO_CUSTODY_ENROLLMENT_TYPE = 'cardano-custody-enrollment' as const;

/**
 * What a new device hands to a device already listed in an account, so that
 * device can add it: its key hash on the account's network. The existing
 * device's add-device consent shows the same fingerprint the new device
 * showed, so the user can check that the hash was not substituted on the
 * way.
 */
export type CardanoCustodyEnrollment = {
  type: 'cardano-custody-enrollment';
  version: 1;
  networkMagic: Cardano.NetworkMagic;
  deviceKeyHash: Ed25519KeyHashHex;
  fingerprint: string;
};

const ENROLLMENT_FIELDS = [
  'type',
  'version',
  'networkMagic',
  'deviceKeyHash',
  'fingerprint',
] as const;

const KEY_HASH_PATTERN = /^[\da-f]{56}$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The enrollment value of a device key, for transfer to a device that
 * already owns the account.
 *
 * @throws {@link CardanoCustodyEnrollmentInvalidError} When the key hash is not 28 bytes of hex.
 */
export const exportCardanoCustodyEnrollment = ({
  networkMagic,
  device: { keyHash },
}: {
  networkMagic: Cardano.NetworkMagic;
  device: Pick<CardanoCustodyDevice, 'keyHash'>;
}): CardanoCustodyEnrollment => {
  const deviceKeyHash = keyHash.toLowerCase() as Ed25519KeyHashHex;
  if (!KEY_HASH_PATTERN.test(deviceKeyHash)) {
    throw new CardanoCustodyEnrollmentInvalidError(
      'expected 28 bytes of hex',
      'deviceKeyHash',
    );
  }
  return {
    type: CARDANO_CUSTODY_ENROLLMENT_TYPE,
    version: 1,
    networkMagic,
    deviceKeyHash,
    fingerprint: custodyDeviceFingerprint(deviceKeyHash),
  };
};

/**
 * Reads an enrollment value, as JSON text or a parsed object, for the
 * network `networkMagic` names. It refuses any other shape, a key hash that
 * is not 28 bytes of lower-case hex, a fingerprint that is not the key
 * hash's, and an enrollment for another network.
 *
 * @throws {@link CardanoCustodyEnrollmentInvalidError}
 */
export const parseCardanoCustodyEnrollment = (
  input: unknown,
  { networkMagic }: { networkMagic: Cardano.NetworkMagic },
): CardanoCustodyEnrollment => {
  let value = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      throw new CardanoCustodyEnrollmentInvalidError('expected JSON');
    }
  }
  if (!isPlainObject(value)) {
    throw new CardanoCustodyEnrollmentInvalidError('expected a JSON object');
  }
  const keys = Object.keys(value);
  if (
    keys.length !== ENROLLMENT_FIELDS.length ||
    !ENROLLMENT_FIELDS.every(field => keys.includes(field))
  ) {
    throw new CardanoCustodyEnrollmentInvalidError(
      `expected exactly ${ENROLLMENT_FIELDS.join(', ')}`,
    );
  }
  if (value.type !== CARDANO_CUSTODY_ENROLLMENT_TYPE) {
    throw new CardanoCustodyEnrollmentInvalidError('unknown type', 'type');
  }
  if (value.version !== 1) {
    throw new CardanoCustodyEnrollmentInvalidError(
      'unsupported version',
      'version',
    );
  }
  if (
    typeof value.deviceKeyHash !== 'string' ||
    !KEY_HASH_PATTERN.test(value.deviceKeyHash)
  ) {
    throw new CardanoCustodyEnrollmentInvalidError(
      'expected 28 bytes of lower-case hex',
      'deviceKeyHash',
    );
  }
  const deviceKeyHash = value.deviceKeyHash as Ed25519KeyHashHex;
  if (value.fingerprint !== custodyDeviceFingerprint(deviceKeyHash)) {
    throw new CardanoCustodyEnrollmentInvalidError(
      'not the fingerprint of the key hash',
      'fingerprint',
    );
  }
  if (value.networkMagic !== networkMagic) {
    throw new CardanoCustodyEnrollmentInvalidError(
      'network-mismatch',
      'networkMagic',
    );
  }
  return {
    type: CARDANO_CUSTODY_ENROLLMENT_TYPE,
    version: 1,
    networkMagic,
    deviceKeyHash,
    fingerprint: value.fingerprint,
  };
};
