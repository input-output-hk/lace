import { Serialization } from '@cardano-sdk/core';

import { encodeCborSet } from './cbor-set-encoding';

import type { HexBlob } from '@cardano-sdk/util';

const VKEY_WITNESSES_KEY = 0n;

/** Number of vkey signatures present in a serialized transaction. */
export const countTransactionSignatures = (
  txCbor: Serialization.TxCBOR,
): number =>
  Serialization.Transaction.fromCbor(txCbor).witnessSet().toCore().signatures
    .size;

/**
 * Builds the witness set returned by a CIP-30 signTx call.
 *
 * Returns the signatures produced by this call that the original transaction
 * does not already contain (compared by pubkey and signature, so a freshly
 * produced signature overrides a different one for the same key). The vkey set
 * is encoded to match the transaction's own set encoding ('hasTaggedSets') so
 * the assembled transaction stays consistent. The map is written directly to
 * avoid 'TransactionWitnessSet.toCbor()', which re-encodes the set under the
 * global 'inConwayEra' flag.
 */
export const buildCip30SignTxWitnessSet = (
  originalTxCbor: Serialization.TxCBOR,
  signedTxCbor: Serialization.TxCBOR,
): HexBlob => {
  const originalTx = Serialization.Transaction.fromCbor(originalTxCbor);
  const signedTx = Serialization.Transaction.fromCbor(signedTxCbor);

  const existingSignatures = originalTx.witnessSet().toCore().signatures;
  const signedSignatures = signedTx.witnessSet().toCore().signatures;
  const ownSignatures = [...signedSignatures].filter(
    ([pubKey, signature]) => existingSignatures.get(pubKey) !== signature,
  );

  const writer = new Serialization.CborWriter();

  if (ownSignatures.length === 0) {
    writer.writeStartMap(0);
    return writer.encodeAsHex();
  }

  const vkeyWitnesses = ownSignatures.map(signature =>
    Serialization.VkeyWitness.fromCore(signature).toCbor(),
  );
  const vkeySet = encodeCborSet(
    vkeyWitnesses,
    originalTx.body().hasTaggedSets(),
  );

  writer.writeStartMap(1);
  writer.writeInt(VKEY_WITNESSES_KEY);
  writer.writeEncodedValue(Buffer.from(vkeySet, 'hex'));
  return writer.encodeAsHex();
};
