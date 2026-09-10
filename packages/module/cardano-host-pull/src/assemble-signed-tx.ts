import { Serialization } from '@cardano-sdk/core';
import { HexBytes } from '@lace-lib/util';

import type { HexBlob } from '@cardano-sdk/util';

/**
 * Assemble the SIGNED tx from the unsigned tx cbor + the host's returned
 * `TransactionWitnessSet` cbor (a `{0: [vkeyWitnesses]}` map — the host's own
 * signatures). Signing is a host ceremony; the guest never holds the secret,
 * so it only merges the host vkeys into the unsigned tx at the CBOR layer.
 *
 * Stays on the Serialization (CBOR) layer throughout — never calls `toCore` on
 * any part of the tx. A core roundtrip can re-encode plutus data and redeemers
 * in a way that invalidates the script data hash committed to in the body. This
 * DUPLICATES the merge of
 * `blockchain-cardano/src/tx-executor-implementation/merge-pre-existing-vkeys.ts`
 * (ADR 14 forbids importing across modules).
 *
 * Host signatures win on pubkey collision.
 */
export const assembleSignedTx = (
  unsignedTxCbor: string,
  witnessSetCborHex: string,
): { serializedTx: HexBytes; signatureCount: number } => {
  const tx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(unsignedTxCbor),
  );
  const hostWitnessSet = Serialization.TransactionWitnessSet.fromCbor(
    witnessSetCborHex as HexBlob,
  );
  // The unsigned tx's own witness set — preserves scripts / plutus data etc.
  const witnessSet = tx.witnessSet();

  const byPubkey = new Map<string, Serialization.VkeyWitness>();
  for (const vw of witnessSet.vkeys()?.values() ?? []) {
    byPubkey.set(vw.vkey(), vw);
  }
  for (const vw of hostWitnessSet.vkeys()?.values() ?? []) {
    byPubkey.set(vw.vkey(), vw);
  }

  // Reuse a live CborSet (prefer the host's) to avoid rebuilding from core.
  const mergedSet = hostWitnessSet.vkeys() ?? witnessSet.vkeys();
  if (mergedSet) {
    mergedSet.setValues([...byPubkey.values()]);
    witnessSet.setVkeys(mergedSet);
  }

  const signedTx = new Serialization.Transaction(
    tx.body(),
    witnessSet,
    tx.auxiliaryData(),
  );
  return {
    serializedTx: HexBytes(signedTx.toCbor()),
    signatureCount: byPubkey.size,
  };
};
