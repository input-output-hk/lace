import { ByteArray, HexBytes } from '../value-objects/bytes.vo';

import type { Argon2idImplementation } from './kdf';

/** The hex-byte bridge implemented by the native Argon2 modules. */
export type NativeArgon2id = (
  ...args: [
    passwordHex: string,
    saltHex: string,
    memoryKb: number,
    iterations: number,
    parallelism: number,
    outLength: number,
  ]
) => Promise<unknown>;

/**
 * Adapts a native hex-byte bridge to SecretBox's byte API.
 *
 * @param derive - The platform bridge; the app handles module availability.
 * @returns An implementation that rejects malformed native output.
 */
export const createNativeArgon2id =
  (derive: NativeArgon2id): Argon2idImplementation =>
  async (password, salt, { m, t, p, dkLen }) => {
    const derivedHex = await derive(
      HexBytes.fromByteArray(password),
      HexBytes.fromByteArray(salt),
      m,
      t,
      p,
      dkLen,
    );
    if (
      typeof derivedHex !== 'string' ||
      derivedHex.length !== dkLen * 2 ||
      !/^[\da-f]+$/i.test(derivedHex)
    ) {
      throw new Error(
        `Native argon2id returned an invalid result: expected ${dkLen} bytes`,
      );
    }
    return ByteArray.fromHex(HexBytes(derivedHex));
  };
