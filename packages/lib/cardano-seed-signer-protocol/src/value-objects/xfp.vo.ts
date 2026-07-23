import { Buffer } from 'buffer';

import type { Tagged } from 'type-fest';

/** Length in bytes of a master fingerprint (BTC BIP-32, 4 bytes). */
export const XFP_LENGTH = 4;

/**
 * Master fingerprint (xfp): the 4-byte Bitcoin secp256k1 BIP-32 fingerprint of
 * a seed, used to match a signer to the loaded seed. Some message fields allow
 * an empty value to mean "unspecified"; those call sites validate with
 * allowEmpty.
 */
export type Xfp = Tagged<Uint8Array, 'Xfp'>;

const assertLength = (value: Uint8Array, allowEmpty: boolean): void => {
  if (allowEmpty && value.length === 0) return;
  if (value.length !== XFP_LENGTH) {
    throw new Error(`xfp must be ${XFP_LENGTH} bytes, got ${value.length}`);
  }
};

/**
 * Wraps raw bytes as an {@link Xfp}, validating the length. Pass allowEmpty to
 * permit a zero-length value (used by fields where xfp is optional on-wire).
 */
export const Xfp = (
  value: Uint8Array,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): Xfp => {
  assertLength(value, allowEmpty);
  return value as Xfp;
};

Xfp.fromHex = (hex: string, options?: { allowEmpty?: boolean }): Xfp =>
  Xfp(Buffer.from(hex, 'hex'), options);
