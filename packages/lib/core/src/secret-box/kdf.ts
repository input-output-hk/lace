import { argon2idAsync } from '@lace-lib/vendor';

import { DERIVED_KEY_LEN } from './constants';

/**
 * Fixed Argon2id cost parameters for the `SBV1` scheme: `m` is memory in KiB,
 * `t` is the number of passes, and `p` is the degree of parallelism.
 *
 * @remarks
 * Values match the OWASP minimum recommendation for Argon2id
 * (m = 19456 KiB, t = 2, p = 1). The parameters are hard-coded rather than
 * embedded in the envelope; a change to them ships as a new magic (`SBV2`).
 */
const SBV1_ARGON2ID = { m: 19_456, t: 2, p: 1 } as const;

/**
 * Cost parameters and output length for a single Argon2id derivation: `m` is
 * memory in KiB, `t` is the number of passes, `p` is the degree of
 * parallelism, and `dkLen` is the derived key length in bytes.
 */
export type Argon2idParams = {
  readonly m: number;
  readonly t: number;
  readonly p: number;
  readonly dkLen: number;
};

/**
 * An Argon2id (version 1.3) key derivation function.
 *
 * @param password - The user secret bytes; never a string.
 * @param salt - The random salt from the envelope.
 * @param params - The cost parameters and derived key length.
 * @returns A promise for the `params.dkLen`-byte derived key.
 */
export type Argon2idImplementation = (
  password: Uint8Array,
  salt: Uint8Array,
  params: Argon2idParams,
) => Promise<Uint8Array>;

const jsArgon2id: Argon2idImplementation = async (password, salt, params) =>
  argon2idAsync(password, salt, params);

const active = { argon2id: jsArgon2id };

/**
 * Replaces the Argon2id implementation used by `seal` and `open`.
 *
 * @remarks
 * Register a platform implementation before any seal or open operation.
 *
 * @param implementation - The implementation to use, or `undefined` to
 * restore the default.
 */
export const setArgon2idImplementation = (
  implementation?: Argon2idImplementation,
): void => {
  active.argon2id = implementation ?? jsArgon2id;
};

/**
 * Derives the 32-byte ChaCha20 key from a password and salt using Argon2id.
 *
 * @remarks
 * The caller is responsible for zeroing the returned key once it has been
 * used.
 *
 * @param password - The user secret bytes; never a string.
 * @param salt - The {@link SALT_LEN}-byte random salt from the envelope.
 * @returns A promise for the derived {@link DERIVED_KEY_LEN}-byte key.
 */
export const deriveKey = async (
  password: Uint8Array,
  salt: Uint8Array,
): Promise<Uint8Array> =>
  active.argon2id(password, salt, { ...SBV1_ARGON2ID, dkLen: DERIVED_KEY_LEN });
