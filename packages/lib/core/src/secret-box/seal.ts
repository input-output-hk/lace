import { chacha20poly1305, randomBytes } from '@lace-lib/vendor';

import { encodeHeader, HEADER_LEN, NONCE_LEN, SALT_LEN } from './format';
import { deriveKey } from './kdf';

/**
 * Encrypts a secret under a password, producing an `SBV1` Secret Box envelope.
 *
 * @remarks
 * A fresh random salt ({@link SALT_LEN} bytes) and nonce ({@link NONCE_LEN}
 * bytes) are generated per call, so encrypting the same plaintext twice yields
 * distinct blobs and a nonce is never reused under a given derived key. The key
 * is derived with Argon2id (see {@link deriveKey}) and zeroed before returning.
 * The 48-byte header is bound as associated data and is authenticated though
 * not encrypted.
 *
 * @param plaintext - The secret bytes to protect.
 * @param password - The user secret bytes; never a string.
 * @returns A promise for the sealed blob, laid out as
 * MAGIC + salt + nonce + ciphertext + 16-byte Poly1305 tag.
 * @throws RangeError If salt or nonce length is not canonical (propagated from
 * {@link encodeHeader}).
 */
export const seal = async (
  plaintext: Uint8Array,
  password: Uint8Array,
): Promise<Uint8Array> => {
  const salt = randomBytes(SALT_LEN);
  const nonce = randomBytes(NONCE_LEN);
  const header = encodeHeader(salt, nonce);
  const key = await deriveKey(password, salt);
  try {
    const body = chacha20poly1305(key, nonce, header).encrypt(plaintext);
    const blob = new Uint8Array(HEADER_LEN + body.length);
    blob.set(header, 0);
    blob.set(body, HEADER_LEN);
    return blob;
  } finally {
    key.fill(0);
  }
};
