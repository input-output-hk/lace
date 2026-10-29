import type { Tagged } from 'type-fest';

const ENTROPY_BYTE_LENGTH = 32;
const ENTROPY_HEX_LENGTH = ENTROPY_BYTE_LENGTH * 2;
const HEX_PATTERN = /^[0-9a-fA-F]+$/;

/** 32-byte hex-encoded entropy used as HKDF input for mnemonic derivation. */
export type EntropyHex = Tagged<string, 'EntropyHex'>;
/**
 * Types 32 bytes of entropy, as 64 hex characters, for `Mnemonic.deriveFrom`.
 * Throws when the value has another length or is not hex.
 */
export const EntropyHex = (value: string): EntropyHex => {
  if (value.length !== ENTROPY_HEX_LENGTH) {
    throw new Error(
      `EntropyHex must be ${ENTROPY_BYTE_LENGTH} bytes (${ENTROPY_HEX_LENGTH} hex characters), got ${value.length}`,
    );
  }
  if (!HEX_PATTERN.test(value)) {
    throw new Error('EntropyHex must be a hex-encoded string');
  }
  return value as EntropyHex;
};
