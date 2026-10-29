import { InvalidStringError } from '@cardano-sdk/util';

import type { HexBlob } from '@cardano-sdk/util';

/** Byte length of every key hash and script hash the contract handles. */
export const HASH_28_BYTE_LENGTH = 28;

const LOWER_CASE_HEX = /^(?:[\da-f]{2})*$/;
const WHOLE_BYTES_HEX = /^(?:[\da-f]{2})*$/i;

/** Whether a value is lower-case hex of whole bytes, optionally of a given byte length. */
export const isLowerCaseHex = (
  value: unknown,
  byteLength?: number,
): value is HexBlob =>
  typeof value === 'string' &&
  LOWER_CASE_HEX.test(value) &&
  (byteLength === undefined || value.length === byteLength * 2);

/** Whether a value is the lower-case hex of a 28-byte hash. */
export const isHash28Hex = (value: unknown): value is HexBlob =>
  isLowerCaseHex(value, HASH_28_BYTE_LENGTH);

/**
 * The bytes of a hex string. Throws for an odd length or a non-hex character
 * rather than silently dropping or zeroing them: `HexBlob` admits an odd
 * length, and an encoder must never write bytes other than the ones it holds.
 */
export const hexToBytes = (hex: string): Uint8Array => {
  if (!WHOLE_BYTES_HEX.test(hex)) {
    throw new InvalidStringError(`expected hex of whole bytes, got '${hex}'`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
};

export const bytesToHex = (bytes: Uint8Array): HexBlob =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(
    '',
  ) as HexBlob;
