/**
 * Binary envelope format for the `SBV1` Secret Box scheme.
 *
 * @remarks
 * A sealed blob is a fixed 48-byte header followed by the authenticated
 * ciphertext:
 *
 * ```
 * | offset | size | field            |
 * |--------|------|------------------|
 * | 0      | 4    | MAGIC ("SBV1")   |
 * | 4      | 32   | salt             |
 * | 36     | 12   | nonce            |
 * | 48     | N    | ciphertext+tag   |  (Poly1305 tag = last 16 bytes)
 * ```
 *
 * The magic identifies the scheme in full: Argon2id with the fixed `SBV1` cost
 * parameters followed by ChaCha20-Poly1305 (IETF). The cost parameters are
 * hard-coded rather than embedded; a change to the scheme ships as a new magic
 * (`SBV2`), never as a mutated `SBV1` blob. The entire 48-byte header is bound
 * as ChaCha20-Poly1305 associated data, so tampering with the magic, salt, or
 * nonce fails authentication on open.
 */

/** The 4-byte magic prefixing every `SBV1` envelope: ASCII "SBV1". */
export const MAGIC = Uint8Array.from([0x53, 0x42, 0x56, 0x31]);

/** Length, in bytes, of the random salt fed to Argon2id. */
export const SALT_LEN = 32;

/** Length, in bytes, of the ChaCha20-Poly1305 (IETF) nonce. */
export const NONCE_LEN = 12;

const MAGIC_LEN = 4;
const OFF_MAGIC = 0;
const OFF_SALT = OFF_MAGIC + MAGIC_LEN;
const OFF_NONCE = OFF_SALT + SALT_LEN;

/** Total length, in bytes, of the fixed `SBV1` header (MAGIC + salt + nonce). */
export const HEADER_LEN = OFF_NONCE + NONCE_LEN;

/** The decoded, non-secret header components plus the ciphertext body. */
export interface DecodedEnvelope {
  /** The salt used to derive the encryption key via Argon2id; {@link SALT_LEN} bytes. */
  readonly salt: Uint8Array;
  /** The ChaCha20-Poly1305 nonce; {@link NONCE_LEN} bytes. */
  readonly nonce: Uint8Array;
  /** The ciphertext with the 16-byte Poly1305 tag appended as its last 16 bytes. */
  readonly body: Uint8Array;
}

/**
 * Checks whether a blob begins with the `SBV1` magic.
 *
 * @remarks
 * Used to distinguish the current format from legacy EMIP-003 blobs, which
 * carry no magic. Inspects only the magic and length; performs no cryptography
 * and never throws.
 * @param blob - The candidate bytes to inspect.
 * @returns `true` if the blob begins with the `SBV1` magic; otherwise `false`.
 */
const hasMagic = (blob: Uint8Array): boolean => {
  if (blob.length < MAGIC_LEN) return false;
  for (let index = 0; index < MAGIC_LEN; index++) {
    if (blob[index] !== MAGIC[index]) return false;
  }
  return true;
};

/**
 * Determines whether a blob is an `SBV1` Secret Box envelope.
 *
 * @remarks
 * Used to distinguish the current format from legacy EMIP-003 blobs, which
 * carry no magic. Inspects only the magic and length; performs no cryptography
 * and never throws.
 *
 * @param blob - The candidate bytes to inspect.
 * @returns `true` if the blob begins with the `SBV1` magic and is at least
 * {@link HEADER_LEN} bytes long; otherwise `false`.
 */
export const isSealed = (blob: Uint8Array): boolean =>
  blob.length >= HEADER_LEN && hasMagic(blob);

/**
 * Builds the fixed 48-byte `SBV1` header from a salt and nonce.
 *
 * @remarks
 * The header is both the literal prefix of the sealed blob and the
 * associated-data input to ChaCha20-Poly1305, so the same bytes authenticate
 * the envelope on seal and open.
 *
 * @param salt - The salt; must be exactly {@link SALT_LEN} bytes.
 * @param nonce - The nonce; must be exactly {@link NONCE_LEN} bytes.
 * @returns A new {@link HEADER_LEN}-byte array containing MAGIC + salt + nonce.
 * @throws RangeError If `salt` or `nonce` is not its canonical length.
 */
export const encodeHeader = (
  salt: Uint8Array,
  nonce: Uint8Array,
): Uint8Array => {
  if (salt.length !== SALT_LEN) {
    throw new RangeError(`salt must be ${SALT_LEN} bytes, got ${salt.length}`);
  }
  if (nonce.length !== NONCE_LEN) {
    throw new RangeError(
      `nonce must be ${NONCE_LEN} bytes, got ${nonce.length}`,
    );
  }
  const header = new Uint8Array(HEADER_LEN);
  header.set(MAGIC, OFF_MAGIC);
  header.set(salt, OFF_SALT);
  header.set(nonce, OFF_NONCE);
  return header;
};

/**
 * Parses an `SBV1` envelope into its salt, nonce, and ciphertext body.
 *
 * @remarks
 * Each returned component is a defensive copy, so callers may retain or zero
 * them without aliasing the source blob. Validates structure only; a forged
 * ciphertext is rejected later by open via the authentication tag.
 *
 * @param blob - A blob previously confirmed by {@link isSealed}.
 * @returns The decoded {@link DecodedEnvelope}.
 * @throws Error If the blob lacks the `SBV1` magic or is shorter than
 * {@link HEADER_LEN} bytes.
 */
export const decodeEnvelope = (blob: Uint8Array): DecodedEnvelope => {
  if (!isSealed(blob)) {
    throw new Error('not an SBV1 Secret Box envelope');
  }
  return {
    salt: blob.slice(OFF_SALT, OFF_SALT + SALT_LEN),
    nonce: blob.slice(OFF_NONCE, OFF_NONCE + NONCE_LEN),
    body: blob.slice(HEADER_LEN),
  };
};

/**
 * Extracts the header bytes supplied as ChaCha20-Poly1305 associated data when
 * opening an envelope.
 *
 * @param blob - A sealed `SBV1` blob.
 * @returns A copy of the first {@link HEADER_LEN} bytes (MAGIC + salt + nonce).
 */
export const headerAad = (blob: Uint8Array): Uint8Array =>
  blob.slice(0, HEADER_LEN);
