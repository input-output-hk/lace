import { Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

import { CardanoStakeKeyHash } from '../value-objects/cardano-stake-key-hash.vo';
import { MidnightCoinPubkey } from '../value-objects/midnight-coin-pubkey.vo';

import type { CWalletVariant, DustMappingDatumValue } from './datum';

// =====================================================================
// Inline-datum decoder for the dust-mapping detection path.
// =====================================================================
// Inverse of `encodeDustMappingDatum`. Used by Carbon's
// `useCNightDesignation` hook: walk the UTxOs at the dust generator's
// script address, decode each one's inline datum, and find the entry
// whose `c_wallet.VerificationKey[0]` matches the active account's
// stake-key-hash.
//
// The decoder is defensive — invalid datums (wrong constructor, wrong
// field count, oversize bytestrings) return `undefined` rather than
// throwing. Callers filter by truthy and treat undefined as "this
// UTxO at the script address doesn't belong to my account."
// =====================================================================

export const decodeDustMappingDatum = (
  cbor: HexBlob | string,
): DustMappingDatumValue | undefined => {
  let data: Serialization.PlutusData;
  try {
    data = Serialization.PlutusData.fromCbor(HexBlob(cbor.toString()));
  } catch {
    return undefined;
  }
  const outer = data.asConstrPlutusData();
  if (!outer || outer.getAlternative() !== 0n) return undefined;
  const fields = outer.getData();
  if (fields.getLength() !== 2) return undefined;

  // c_wallet — Constr 0 (VerificationKey [stakeKeyHash]) or Constr 1
  // (Script [scriptHash]).
  const cWalletData = fields.get(0).asConstrPlutusData();
  if (!cWalletData) return undefined;
  const cWalletFields = cWalletData.getData();
  if (cWalletFields.getLength() !== 1) return undefined;
  const credBytes = cWalletFields.get(0).asBoundedBytes();
  if (!credBytes || credBytes.length !== 28) return undefined;
  let cWallet: CWalletVariant;
  if (cWalletData.getAlternative() === 0n) {
    cWallet = {
      kind: 'verificationKey',
      stakeKeyHash: CardanoStakeKeyHash(credBytes),
    };
  } else if (cWalletData.getAlternative() === 1n) {
    cWallet = { kind: 'script', scriptHash: credBytes };
  } else {
    return undefined;
  }

  // dust_address — 32-byte coin public key.
  const dustBytes = fields.get(1).asBoundedBytes();
  if (!dustBytes || dustBytes.length > 33) return undefined;
  let dustAddress: MidnightCoinPubkey;
  try {
    dustAddress = MidnightCoinPubkey(dustBytes);
  } catch {
    return undefined;
  }

  return { cWallet, dustAddress };
};

/**
 * True when the datum's c_wallet VerificationKey hash matches the
 * given stake-key-hash. Used by the designation-detection hook to
 * find the active account's registration UTxO among the script
 * address's outputs.
 */
export const datumMatchesStakeKey = (
  datum: DustMappingDatumValue,
  stakeKeyHash: CardanoStakeKeyHash,
): boolean => {
  if (datum.cWallet.kind !== 'verificationKey') return false;
  if (datum.cWallet.stakeKeyHash.length !== stakeKeyHash.length) return false;
  for (let index = 0; index < stakeKeyHash.length; index++) {
    if (datum.cWallet.stakeKeyHash[index] !== stakeKeyHash[index]) return false;
  }
  return true;
};
