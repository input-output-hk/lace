import { chacha20poly1305 } from '@lace-lib/vendor';

import { emip3decrypt } from '../emip3';

import { decodeEnvelope, headerAad, isSealed } from './format';
import { deriveKey } from './kdf';

const openSealed = async (
  blob: Uint8Array,
  password: Uint8Array,
): Promise<Uint8Array> => {
  const { salt, nonce, body } = decodeEnvelope(blob);
  const key = await deriveKey(password, salt);
  try {
    return chacha20poly1305(key, nonce, headerAad(blob)).decrypt(body);
  } finally {
    key.fill(0);
  }
};

/**
 * Decrypts a blob sealed by `seal` or by the legacy EMIP-003 scheme.
 *
 * @remarks
 * The format is detected from the blob: a leading `SBV1` magic selects the
 * Argon2id + ChaCha20-Poly1305 path; any other input is treated as an EMIP-003
 * blob and decrypted with the SDK's `emip3decrypt` through the `@lace-lib/vendor`
 * seam, so a legacy blob decrypts byte-identically to how the monolith wrote it
 * (ADR 37/38). For the `SBV1` path the derived key is zeroed before returning.
 *
 * An EMIP-003 blob whose 32-byte salt happens to begin with the four `SBV1` magic
 * bytes (probability 2^-32) is detected as sealed; when the `SBV1` path then fails
 * to authenticate, the legacy path is retried so the blob still decrypts.
 * Authentication failure (a wrong password or a tampered blob) surfaces as a
 * thrown error rather than as a corrupt result.
 *
 * @param blob - A sealed `SBV1` blob or a legacy EMIP-003 blob.
 * @param password - The user secret bytes; never a string.
 * @returns A promise for the decrypted plaintext.
 * @throws Error If decryption or authentication fails on both paths.
 */
export const open = async (
  blob: Uint8Array,
  password: Uint8Array,
): Promise<Uint8Array> => {
  if (!isSealed(blob)) {
    return emip3decrypt(blob, password);
  }
  try {
    return await openSealed(blob, password);
  } catch (sealedError) {
    try {
      return await emip3decrypt(blob, password);
    } catch {
      throw sealedError;
    }
  }
};
