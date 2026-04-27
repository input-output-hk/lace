import { HexBytes } from '@lace-sdk/util';

import type { Tagged } from 'type-fest';

/** 32-byte hex-encoded entropy used as HKDF input for mnemonic derivation. */
export type EntropyHex = Tagged<HexBytes, 'EntropyHex'>;
export const EntropyHex = (value: string): EntropyHex => {
  if (value.length !== 64) {
    throw new Error(
      `EntropyHex must be 32 bytes (64 hex characters), got ${value.length}`,
    );
  }
  return HexBytes(value) as EntropyHex;
};
