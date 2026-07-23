import { Serialization } from '@cardano-sdk/core';

import type { CardanoStakeKeyHash } from '../value-objects/cardano-stake-key-hash.vo';
import type { MidnightCoinPubkey } from '../value-objects/midnight-coin-pubkey.vo';
import type { HexBlob } from '@cardano-sdk/util';

// =====================================================================
// DustMappingDatum CBOR encoder + decoder.
// =====================================================================
// Plutus structure (matches the Aiken type definition at
// https://github.com/midnightntwrk/midnight-reserve-contracts,
// validators/cnight_generates_dust.ak — `DustMappingDatum`):
//
//   Constr(0, [
//     c_wallet: union(
//       Constr(0, [stakeKeyHash: bytes(28)])   // VerificationKey
//     | Constr(1, [scriptHash:    bytes(28)])  // Script
//     ),
//     dust_address: bytes(<=33)
//   ])
//
// The Lace wallet only stores Ed25519 stake credentials (no native /
// Plutus stake script credentials surface in onboarding paths today),
// so the public encoder emits the VerificationKey variant. The Script
// variant is kept as a typed pathway for completeness — future hoist
// + cold-staking integrations may need it. We don't expose it in the
// public API surface (`index.ts`) so callers default to the safe
// VerificationKey path.
//
// CBOR encoding follows canonical Plutus rules
// (`Serialization.PlutusData`): constructor tag 121 for alt 0,
// 122 for alt 1, indefinite-length list inside. This matches Blaze's
// `serialize(DustMappingDatum, value).toCbor()` byte-for-byte because
// both libraries implement the same Plutus encoding spec.
// =====================================================================

export type CWalletVariant =
  | { kind: 'script'; scriptHash: Uint8Array }
  | { kind: 'verificationKey'; stakeKeyHash: CardanoStakeKeyHash };

export type DustMappingDatumValue = {
  cWallet: CWalletVariant;
  dustAddress: MidnightCoinPubkey;
};

export const encodeCWallet = (
  cWallet: CWalletVariant,
): Serialization.PlutusData => {
  const fields = new Serialization.PlutusList();
  const hashBytes =
    cWallet.kind === 'verificationKey'
      ? cWallet.stakeKeyHash
      : cWallet.scriptHash;
  fields.add(Serialization.PlutusData.newBytes(hashBytes));
  const alternative = cWallet.kind === 'verificationKey' ? 0n : 1n;
  return Serialization.PlutusData.newConstrPlutusData(
    new Serialization.ConstrPlutusData(alternative, fields),
  );
};

export const encodeDustMappingDatum = (
  value: DustMappingDatumValue,
): Serialization.PlutusData => {
  const fields = new Serialization.PlutusList();
  fields.add(encodeCWallet(value.cWallet));
  fields.add(Serialization.PlutusData.newBytes(value.dustAddress));
  return Serialization.PlutusData.newConstrPlutusData(
    new Serialization.ConstrPlutusData(0n, fields),
  );
};

export const dustMappingDatumToCbor = (value: DustMappingDatumValue): HexBlob =>
  encodeDustMappingDatum(value).toCbor();
