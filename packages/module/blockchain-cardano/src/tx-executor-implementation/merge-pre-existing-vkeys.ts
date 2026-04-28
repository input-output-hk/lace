import { Serialization } from '@cardano-sdk/core';
import { HexBytes } from '@lace-sdk/util';

/**
 * The signer replaces vkey witnesses with its own. For internal flows where the
 * incoming tx may carry counterparty-provided vkeys (e.g. a swap aggregator's
 * batcher signature), preserve them by merging into the signed tx before submit.
 *
 * Stays at the Serialization (CBOR) layer throughout — never calls toCore on
 * any part of the tx. A core roundtrip can re-encode plutus data and redeemers
 * in a way that invalidates the script data hash committed to in the body.
 *
 * Fresh signatures win on pubkey collision.
 */
export const mergePreExistingVkeys = (
  originalTxCbor: HexBytes,
  signedTxCbor: HexBytes,
): HexBytes => {
  const originalTx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(originalTxCbor),
  );
  const originalVkeysSet = originalTx.witnessSet().vkeys();
  if (!originalVkeysSet || originalVkeysSet.size() === 0) return signedTxCbor;

  const signedTx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(signedTxCbor),
  );
  const signedWitnessSet = signedTx.witnessSet();
  const signedVkeysSet = signedWitnessSet.vkeys();

  const byPubkey = new Map<string, Serialization.VkeyWitness>();
  for (const vw of originalVkeysSet.values()) byPubkey.set(vw.vkey(), vw);
  for (const vw of signedVkeysSet?.values() ?? []) byPubkey.set(vw.vkey(), vw);

  // Reuse a live CborSet (prefer the signed tx's) to avoid rebuilding from core.
  const mergedSet = signedVkeysSet ?? originalVkeysSet;
  mergedSet.setValues([...byPubkey.values()]);
  signedWitnessSet.setVkeys(mergedSet);

  const mergedTx = new Serialization.Transaction(
    signedTx.body(),
    signedWitnessSet,
    signedTx.auxiliaryData(),
  );
  return HexBytes(mergedTx.toCbor());
};
