import { deriveSymmetricSecret } from '@lace-lib/crypto';

import { encryptionKeyOver } from './enc-keys';

import type { DeriveSecret } from './enc-keys';
import type { PassportEncryptionKey } from '@lace-contract/passport';

/** Byte length of the BIP-39 seed a MIP-0015 derivation starts from. */
const SEED_LENGTH = 64;

/**
 * A PassportEncryptionKey over an in-memory seed, for development and
 * tests. Production keys reach the seed through a passkey ceremony; this
 * one holds a 64-byte seed directly, generating a fresh one when none is
 * given, and derives this device's reader secret per network with the
 * same MIP-0015 scheme, so its reader key is deterministic for a given
 * seed and network. The account secrets it creates are random, as the
 * passkey key's are, and reach it again only through the envelopes it is
 * handed. Nothing prompts the user, so callers run each flow directly.
 */
export const devEncryptionKey = (
  seed?: Uint8Array,
): Required<PassportEncryptionKey> => {
  if (seed !== undefined && seed.length !== SEED_LENGTH) {
    throw new Error(
      `Dev encryption key seed must be ${SEED_LENGTH} bytes, got ${seed.length}`,
    );
  }
  const heldSeed = seed ?? crypto.getRandomValues(new Uint8Array(SEED_LENGTH));
  const deriveSecret: DeriveSecret = async params =>
    deriveSymmetricSecret(heldSeed, params);
  return encryptionKeyOver(deriveSecret);
};
