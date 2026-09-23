import type { Tagged } from 'type-fest';

// =====================================================================
// MidnightCoinPubkey — the bytes stored verbatim in the
// DustMappingDatum's `dust_address` field.
// =====================================================================
// The name predates the correct model (a rename is a follow-up). This
// is NOT a bare 32-byte key: it is the SCALE-compact encoding of a
// Midnight dust public key — the raw bech32m payload of an `mn_dust…`
// address, stored byte-for-byte. The encoding is variable-length: most
// addresses decode to 33 bytes (a `0x73` header + 32 little-endian
// scalar bytes), but a scalar below 2^248 legitimately encodes to 32
// (`0x6f`) or fewer. We keep whatever bytes we are given verbatim — we
// do NOT strip the header and do NOT SCALE-decode down to 32.
//
// The only length rule here is the validator's own bound,
// `length_of_bytearray(dust_address) <= 33` (see the Aiken debug
// string in the embedded script CBOR): a longer payload would have the
// validator reject our tx at submit time. Payloads of 0..33 bytes are
// accepted as-is — deliberately, because `plutus/datum-decode.ts` builds
// this VO from on-chain datum bytes, where a nonstandard-but-legal
// registration must still read as designated. Canonical-encoding checks
// belong at the designation input boundary (`dust-address-decode.ts`) and
// at the datum-write boundary (`builders/build-night-designation-tx.ts`).
// =====================================================================
export type MidnightCoinPubkey = Tagged<Uint8Array, 'MidnightCoinPubkey'>;

// Upper bound the constructor enforces — the validator's own
// `length_of_bytearray(dust_address) <= 33` check.
export const MIDNIGHT_DUST_ADDRESS_MAX_BYTES = 33;

// `invalid-bech32m` and `invalid-dust-payload` are thrown only by
// `dust-address-decode.ts`, never here.
type MidnightCoinPubkeyErrorCode =
  | 'invalid-bech32m'
  | 'invalid-dust-payload'
  | 'invalid-length';

export class MidnightCoinPubkeyError extends Error {
  public readonly code: MidnightCoinPubkeyErrorCode;
  public constructor(code: MidnightCoinPubkeyErrorCode, message: string) {
    super(message);
    this.name = 'MidnightCoinPubkeyError';
    this.code = code;
  }
}

export const MidnightCoinPubkey = (bytes: Uint8Array): MidnightCoinPubkey => {
  if (bytes.length > MIDNIGHT_DUST_ADDRESS_MAX_BYTES) {
    throw new MidnightCoinPubkeyError(
      'invalid-length',
      `MidnightCoinPubkey accepts at most ${MIDNIGHT_DUST_ADDRESS_MAX_BYTES} bytes, got ${bytes.length}`,
    );
  }
  return bytes as MidnightCoinPubkey;
};

MidnightCoinPubkey.toHex = (pubkey: MidnightCoinPubkey): string =>
  Array.from(pubkey)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
