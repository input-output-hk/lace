import { bech32m } from '@scure/base';

import {
  MidnightCoinPubkey,
  MidnightCoinPubkeyError,
} from './value-objects/midnight-coin-pubkey.vo';
import { CardanoDustNetwork } from './value-objects/network-id.vo';

// =====================================================================
// Dust-address → coin-pubkey decoder (designation input boundary).
// =====================================================================
// A Midnight DUST address (`mn_dust1…` / `mn_dust_test1…`) is a bech32m
// (BIP-350) string whose payload is the SCALE-compact encoding of a
// BLS12-381 scalar. This is the designation *input* boundary: a payload
// that gets past here is written byte-for-byte into the on-chain
// DustMappingDatum's `dust_address` field, so it is checked structurally
// here and then kept verbatim — no stripping, no re-encoding.
//
// The structural rule lives here, not in `MidnightCoinPubkey` — that VO's
// header explains why it must stay lenient for the on-chain decode path.
//
// We deliberately avoid the upstream
// `@midnight-ntwrk/wallet-sdk-address-format` package (which pulls a
// ~10MB ledger WASM SDK) and lean on the `@scure/base` bech32m codec
// this package already depends on.
//
// Mirrors the Carbon reference's `midnight-address-decode.ts`, narrowed
// to the dust kind: `designationRequested.dustPubkeyHex` only ever
// wants a dust target, so shielded / unshielded HRPs are rejected.
//
// ADR 14: no `@lace-contract/midnight-context` import — pure bech32m,
// usable from the Cardano UI without coupling to Midnight modules.
// =====================================================================

/** bech32m string length cap. A dust payload (≤33 bytes) is well under this. */
const BECH32M_LIMIT = 1024;

// Smallest value each SCALE-compact mode may carry — the branch
// thresholds of `@subsquid/scale-codec`'s `Sink.compact`, the encoder the
// Midnight SDK serialises dust addresses with. Below its own mode's
// threshold a shorter encoding existed, so the payload is not minimal.
const COMPACT_MODE_1_MIN = 64n;
const COMPACT_MODE_2_MIN = 1n << 14n;
const COMPACT_MODE_3_MIN = 1n << 30n;

// BLS12-381 scalar field order. The SDK's `DustAddress` constructor
// rejects `data >= modulus`, so a larger scalar is not an address at all.
const BLS12_381_SCALAR_MODULUS = BigInt(
  '0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001',
);

const leBytesToScalar = (bytes: Uint8Array): bigint => {
  let scalar = 0n;
  for (let index = bytes.length - 1; index >= 0; index--) {
    scalar = (scalar << 8n) | BigInt(bytes[index]);
  }
  return scalar;
};

/**
 * Why `payload` is not the canonical (minimal) SCALE-compact encoding of an
 * in-field BLS12-381 scalar, or `undefined` when it is.
 *
 * Minimality is ours to enforce: neither the Midnight SDK codec nor the
 * midnight-node pallet checks it, and a padded encoding's claimability is
 * unknown — so a non-canonical target must never reach the datum.
 *
 * Returns a reason instead of throwing so each boundary can surface it in its
 * own channel: this file throws at the address-string input boundary, the
 * blueprint builder returns `Err` at the datum-write boundary.
 */
export const canonicalDustPayloadDefect = (
  payload: Uint8Array,
): string | undefined => {
  if (payload.length === 0) return 'empty payload';

  const header = payload[0];
  const mode = header & 0b11;
  let scalar: bigint;

  if (mode === 0b00) {
    if (payload.length !== 1) {
      return `single-byte mode declared, ${payload.length}-byte payload`;
    }
    scalar = BigInt(header >> 2);
  } else if (mode === 0b01) {
    if (payload.length !== 2) {
      return `two-byte mode declared, ${payload.length}-byte payload`;
    }
    scalar = BigInt(header >> 2) + (BigInt(payload[1]) << 6n);
    if (scalar < COMPACT_MODE_1_MIN) return `${scalar} fits a shorter mode`;
  } else if (mode === 0b10) {
    if (payload.length !== 4) {
      return `four-byte mode declared, ${payload.length}-byte payload`;
    }
    scalar =
      BigInt(header >> 2) +
      (BigInt(payload[1]) << 6n) +
      (BigInt(payload[2]) << 14n) +
      (BigInt(payload[3]) << 22n);
    if (scalar < COMPACT_MODE_2_MIN) return `${scalar} fits a shorter mode`;
  } else {
    // Big-integer mode: the header's high 6 bits carry the scalar's byte
    // count offset by 4, so the payload is exactly `1 + declared` bytes.
    const declaredScalarBytes = (header >> 2) + 4;
    if (payload.length !== declaredScalarBytes + 1) {
      return `${declaredScalarBytes}-byte scalar declared, ${
        payload.length - 1
      } bytes present`;
    }
    // Last byte of a little-endian scalar is its most significant one; a
    // zero there means the declared byte count was padded.
    if (payload[payload.length - 1] === 0) {
      return 'most significant scalar byte is zero';
    }
    scalar = leBytesToScalar(payload.subarray(1));
    if (scalar < COMPACT_MODE_3_MIN) return `${scalar} fits a shorter mode`;
  }

  return scalar >= BLS12_381_SCALAR_MODULUS
    ? 'scalar is outside the BLS12-381 field'
    : undefined;
};

/**
 * @throws {MidnightCoinPubkeyError} `invalid-dust-payload` when `payload` is
 *   not the canonical SCALE-compact encoding of an in-field BLS12-381 scalar.
 */
const assertCanonicalDustPayload = (payload: Uint8Array): void => {
  const defect = canonicalDustPayloadDefect(payload);
  if (defect !== undefined) {
    throw new MidnightCoinPubkeyError(
      'invalid-dust-payload',
      `Not a canonical SCALE-compact dust payload (${defect})`,
    );
  }
};

type MidnightDustAddressDetail = {
  /** Lowercase hex of the validated payload, verbatim — the bytes that go on chain. */
  coinPubkeyHex: string;
  kind: 'dust';
  /** Derived from the HRP: bare `mn_dust` is mainnet, any `mn_dust_*` is testnet. */
  network: CardanoDustNetwork;
};

/** `mn_dust` → mainnet; `mn_dust_<network>` → testnet; anything else → not a dust HRP. */
const dustNetworkFromHrp = (hrp: string): CardanoDustNetwork | undefined => {
  if (hrp === 'mn_dust') return CardanoDustNetwork.mainnet;
  if (hrp.startsWith('mn_dust_')) return CardanoDustNetwork.testnet;
  return undefined;
};

/**
 * Decode a Midnight dust address to its coin public key, accepting only a
 * canonical address: the payload must be the minimal SCALE-compact encoding
 * of a BLS12-381 scalar, consuming the whole bech32m payload. The accepted
 * payload is returned verbatim as hex — the exact bytes that go on chain.
 *
 * @throws {MidnightCoinPubkeyError} `invalid-bech32m` when the string is
 *   not bech32m or not a `mn_dust*` HRP; `invalid-dust-payload` when the
 *   payload is not a canonical scalar encoding (which subsumes any over-long
 *   payload — a canonical in-field scalar never exceeds 33 bytes).
 */
export const dustAddressToCoinPubkeyHex = (
  address: string,
): MidnightDustAddressDetail => {
  let decoded: { prefix: string; words: number[] };
  try {
    decoded = bech32m.decode(address as `${string}1${string}`, BECH32M_LIMIT);
  } catch (error) {
    throw new MidnightCoinPubkeyError(
      'invalid-bech32m',
      `Not a bech32m-encoded address: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const network = dustNetworkFromHrp(decoded.prefix);
  if (network === undefined) {
    throw new MidnightCoinPubkeyError(
      'invalid-bech32m',
      `Not a Midnight dust address (HRP: ${decoded.prefix})`,
    );
  }

  const payload = bech32m.fromWords(decoded.words);
  assertCanonicalDustPayload(payload);

  // Redundant for a canonical payload (a scalar < r never exceeds 33 bytes),
  // kept as the last mirror of the validator's own `<= 33` bound.
  const pubkey = MidnightCoinPubkey(payload);

  return {
    coinPubkeyHex: MidnightCoinPubkey.toHex(pubkey),
    kind: 'dust',
    network,
  };
};
