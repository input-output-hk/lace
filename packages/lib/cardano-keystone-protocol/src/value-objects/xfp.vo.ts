import { Buffer } from 'buffer';

import type { Tagged } from 'type-fest';

/** Length in bytes of a master fingerprint (BIP-32, 4 bytes). */
export const XFP_LENGTH = 4;

/**
 * Master fingerprint (xfp): the 4-byte BIP-32 fingerprint of a seed, used to
 * match a signing request to the seed loaded on the device.
 */
export type Xfp = Tagged<Uint8Array, 'Xfp'>;

/** Wraps raw bytes as an {@link Xfp}, validating the length. */
export const Xfp = (value: Uint8Array): Xfp => {
  if (value.length !== XFP_LENGTH) {
    throw new Error(`xfp must be ${XFP_LENGTH} bytes, got ${value.length}`);
  }
  return value as Xfp;
};

Xfp.fromHex = (hex: string): Xfp => Xfp(Buffer.from(hex, 'hex'));

Xfp.toHex = (value: Xfp): string => Buffer.from(value).toString('hex');
