import { Serialization } from '@cardano-sdk/core';

import { getUniqueSignerKeyHashes } from './signing/getUniqueSigners';

import type { Cardano } from '@cardano-sdk/core';
import type * as Crypto from '@cardano-sdk/crypto';

// A vkey witness is a fixed-width 32-byte key plus 64-byte signature, so only
// the witness COUNT affects the serialized size. These dummy values are
// content-independent (keeping the estimate deterministic). The keys are
// distinct per index so the signatures map does not dedupe and under-count.
const DUMMY_SIGNATURE = 'f'.repeat(128) as Crypto.Ed25519SignatureHex;
const dummyVkey = (index: number): Crypto.Ed25519PublicKeyHex =>
  index.toString(16).padStart(64, '0') as Crypto.Ed25519PublicKeyHex;

/**
 * Byte length of `tx` once signed. Estimated exactly by populating one dummy
 * vkey witness per unique signer and letting the serializer measure the result
 * (the cardano-sdk `getTxSize` technique), which counts the real Conway witness
 * set framing, unlike a hand-summed byte formula.
 *
 * `resolvedInputs` must resolve every input so the signer count (input payment
 * keys plus withdrawal / certificate stake keys) is complete: an incomplete set
 * would under-count witnesses and under-estimate the size, the dangerous
 * direction for a size guard.
 */
export const estimateSignedTxSize = (
  tx: Serialization.Transaction,
  resolvedInputs: Cardano.Utxo[],
): number => {
  const core = tx.toCore();
  const signerCount = getUniqueSignerKeyHashes(core, resolvedInputs).size;
  const signatures: Cardano.Signatures = new Map();
  for (let index = 0; index < signerCount; index++) {
    signatures.set(dummyVkey(index), DUMMY_SIGNATURE);
  }
  const signed = Serialization.Transaction.fromCore({
    ...core,
    witness: { ...core.witness, signatures },
  });
  // CBOR hex is even-length, two hex chars per byte.
  return signed.toCbor().length / 2;
};
