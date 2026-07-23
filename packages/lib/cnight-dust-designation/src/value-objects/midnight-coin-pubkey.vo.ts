import { bech32m } from '@scure/base';

import type { Tagged } from 'type-fest';

// =====================================================================
// MidnightCoinPubkey — 32-byte coin public key embedded in the
// DustMappingDatum's `dust_address` field.
// =====================================================================
// The on-chain validator enforces `length_of_bytearray(dust_address) <=
// 33` (see Aiken debug string in the embedded script CBOR). The actual
// coin public key is 32 bytes; the +1 byte tolerance is unused. We
// reject anything other than exactly 32 bytes here so the validator
// cannot reject our tx at submit time for a length violation.
//
// The user-visible Midnight shielded address (bech32m, ~132 chars
// starting with `mn_shield-addr_`) wraps the coin pubkey along with
// other key material. The dapp extracts the pubkey via
// `bech32m.decode(addr).fromWords().slice(0, 32)` — same conversion
// here for parity. Within the Lace wallet we'll usually source this
// directly from the Midnight account rather than parsing an address;
// the address-parsing path is kept for external-target support.
// =====================================================================
export type MidnightCoinPubkey = Tagged<Uint8Array, 'MidnightCoinPubkey'>;

export const MIDNIGHT_COIN_PUBKEY_LENGTH = 32;
export const MIDNIGHT_DUST_ADDRESS_MAX_BYTES = 33;

export class MidnightCoinPubkeyError extends Error {
  public readonly code: 'invalid-bech32m' | 'invalid-length';
  public constructor(
    code: 'invalid-bech32m' | 'invalid-length',
    message: string,
  ) {
    super(message);
    this.name = 'MidnightCoinPubkeyError';
    this.code = code;
  }
}

export const MidnightCoinPubkey = (bytes: Uint8Array): MidnightCoinPubkey => {
  if (bytes.length !== MIDNIGHT_COIN_PUBKEY_LENGTH) {
    throw new MidnightCoinPubkeyError(
      'invalid-length',
      `MidnightCoinPubkey expects ${MIDNIGHT_COIN_PUBKEY_LENGTH} bytes, got ${bytes.length}`,
    );
  }
  return bytes as MidnightCoinPubkey;
};

MidnightCoinPubkey.fromShieldedAddress = (
  shieldedAddress: string,
): MidnightCoinPubkey => {
  try {
    const decoded = bech32m.decodeUnsafe(
      shieldedAddress as `${string}1${string}`,
    );
    if (!decoded) {
      throw new MidnightCoinPubkeyError(
        'invalid-bech32m',
        `Not a bech32m-encoded address: ${shieldedAddress}`,
      );
    }
    const bytes = bech32m.fromWords(decoded.words);
    return MidnightCoinPubkey(bytes.slice(0, MIDNIGHT_COIN_PUBKEY_LENGTH));
  } catch (error) {
    if (error instanceof MidnightCoinPubkeyError) throw error;
    throw new MidnightCoinPubkeyError(
      'invalid-bech32m',
      `Failed to decode bech32m address: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

MidnightCoinPubkey.toHex = (pubkey: MidnightCoinPubkey): string =>
  Array.from(pubkey)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

MidnightCoinPubkey.fromHex = (hex: string): MidnightCoinPubkey => {
  const normalised = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]+$/.test(normalised)) {
    throw new MidnightCoinPubkeyError(
      'invalid-length',
      `MidnightCoinPubkey hex contains non-hex characters: ${hex}`,
    );
  }
  if (normalised.length !== MIDNIGHT_COIN_PUBKEY_LENGTH * 2) {
    throw new MidnightCoinPubkeyError(
      'invalid-length',
      `MidnightCoinPubkey hex expects ${
        MIDNIGHT_COIN_PUBKEY_LENGTH * 2
      } chars, got ${normalised.length}`,
    );
  }
  const bytes = new Uint8Array(MIDNIGHT_COIN_PUBKEY_LENGTH);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = parseInt(normalised.slice(index * 2, index * 2 + 2), 16);
  }
  return MidnightCoinPubkey(bytes);
};
