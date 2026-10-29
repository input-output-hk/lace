import { Serialization } from '@cardano-sdk/core';
import {
  Ed25519PublicKey,
  Ed25519PublicKeyHex,
  Ed25519Signature,
  Ed25519SignatureHex,
  ready,
} from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { hashEd25519PublicKey } from '@lace-lib/core';
import { HexBytes } from '@lace-lib/util';

import type { Cardano } from '@cardano-sdk/core';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';

/** One vkey witness: an Ed25519 public key and its signature over a body hash. */
export type CardanoVkeyWitness = {
  vkey: Ed25519PublicKeyHex;
  signature: Ed25519SignatureHex;
};

/** The outcome of checking vkey witnesses against one transaction. */
type VkeyWitnessVerification = {
  /** Witnesses whose signature verifies, keyed by the BLAKE2b-224 hash of their key. */
  valid: Map<Ed25519KeyHashHex, CardanoVkeyWitness>;
  /** Witnesses that are malformed or whose signature does not verify. */
  invalid: CardanoVkeyWitness[];
};

/** Two witnesses for one key carry different signatures. */
export class VkeyWitnessConflictError extends Error {
  public constructor(readonly vkey: Ed25519PublicKeyHex) {
    super(`Conflicting vkey witnesses for public key ${vkey}`);
    this.name = 'VkeyWitnessConflictError';
  }
}

/**
 * Whether `witness` is a valid Ed25519 signature over `txId`, the transaction
 * body hash every vkey witness signs. A malformed key or signature is invalid,
 * not an error.
 */
const verifyVkeyWitness = async (
  txId: Cardano.TransactionId,
  witness: CardanoVkeyWitness,
): Promise<boolean> => {
  await ready();
  try {
    return Ed25519PublicKey.fromHex(witness.vkey).verify(
      Ed25519Signature.fromHex(witness.signature),
      HexBlob(txId),
    );
  } catch {
    return false;
  }
};

/**
 * Verifies every witness over `txId` and reports which key hashes produced a
 * valid signature. Callers decide which of those keys they expected: a valid
 * signature only proves the key holder signed this body.
 */
export const verifyVkeyWitnesses = async (
  txId: Cardano.TransactionId,
  witnesses: Iterable<CardanoVkeyWitness>,
): Promise<VkeyWitnessVerification> => {
  const verification: VkeyWitnessVerification = {
    valid: new Map(),
    invalid: [],
  };
  for (const witness of witnesses) {
    if (await verifyVkeyWitness(txId, witness)) {
      verification.valid.set(hashEd25519PublicKey(witness.vkey), witness);
    } else {
      verification.invalid.push(witness);
    }
  }
  return verification;
};

// Map key of the vkey witnesses in a transaction witness set.
const VKEY_WITNESSES_KEY = 0n;

/**
 * Adds vkey witnesses to a transaction, keeping every witness it already
 * carries. Only the vkey set is rewritten: every other witness set field, the
 * body and the auxiliary data keep their exact bytes, so the body hash and the
 * script data hash still hold.
 *
 * The vkey set comes out sorted by key, so merging the same witnesses in any
 * order or in several steps gives the same bytes. A witness the transaction
 * already carries is skipped, and the transaction is returned unchanged when
 * nothing is added. Signatures are not checked here; run
 * {@link verifyVkeyWitnesses} first.
 *
 * @throws `VkeyWitnessConflictError` When a key would carry two different
 *   signatures.
 */
export const mergeVkeyWitnesses = (
  serializedTx: HexBytes,
  witnesses: Iterable<CardanoVkeyWitness>,
): HexBytes => {
  const tx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(serializedTx),
  );

  const byVkey = new Map<Ed25519PublicKeyHex, Ed25519SignatureHex>();
  /** @returns Whether the witness was new. */
  const put = ({ vkey, signature }: CardanoVkeyWitness): boolean => {
    const key = Ed25519PublicKeyHex(vkey.toLowerCase());
    const value = Ed25519SignatureHex(signature.toLowerCase());
    const present = byVkey.get(key);
    if (present !== undefined && present !== value) {
      throw new VkeyWitnessConflictError(key);
    }
    byVkey.set(key, value);
    return present === undefined;
  };

  // The witness set is copied field by field as encoded bytes: decoding it
  // through `TransactionWitnessSet` would re-encode the bootstrap set too.
  const otherFields: Array<[bigint, Uint8Array]> = [];
  const reader = new Serialization.CborReader(tx.witnessSet().toCbor());
  reader.readStartMap();
  while (reader.peekState() !== Serialization.CborReaderState.EndMap) {
    const key = reader.readInt();
    const value = reader.readEncodedValue();
    if (key !== VKEY_WITNESSES_KEY) {
      otherFields.push([key, value]);
      continue;
    }
    const vkeys = Serialization.CborSet.fromCbor(
      HexBlob.fromBytes(value),
      Serialization.VkeyWitness.fromCbor,
    );
    for (const witness of vkeys.values()) {
      put({ vkey: witness.vkey(), signature: witness.signature() });
    }
  }
  reader.readEndMap();

  let hasAdded = false;
  for (const witness of witnesses) {
    if (put(witness)) hasAdded = true;
  }
  if (!hasAdded) return serializedTx;

  const vkeys = Serialization.CborSet.fromCore(
    [...byVkey].sort(([a], [b]) => (a < b ? -1 : 1)),
    Serialization.VkeyWitness.fromCore,
  );
  const writer = new Serialization.CborWriter();
  writer.writeStartMap(otherFields.length + 1);
  writer.writeInt(VKEY_WITNESSES_KEY);
  writer.writeEncodedValue(Buffer.from(vkeys.toCbor(), 'hex'));
  for (const [key, value] of otherFields) {
    writer.writeInt(key);
    writer.writeEncodedValue(value);
  }
  tx.setWitnessSet(
    Serialization.TransactionWitnessSet.fromCbor(HexBlob(writer.encodeAsHex())),
  );
  return HexBytes(tx.toCbor());
};
