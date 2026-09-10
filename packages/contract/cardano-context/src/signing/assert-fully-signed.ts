import { hashEd25519PublicKey } from '@lace-lib/core';

import { getUniqueSignerKeyHashes } from './getUniqueSigners';

import type { Cardano, Serialization } from '@cardano-sdk/core';

/**
 * Thrown pre-submit when a signed transaction lacks a vkey witness for a key
 * hash it requires. Distinct type so a caller can fail closed on it (never
 * submit an under-signed tx that would be rejected while a bare txId would read
 * as success).
 */
export class TransactionUnderSignedError extends Error {
  public constructor(readonly missingKeyHashes: string[]) {
    super(
      `transaction is missing vkey witnesses for required signers: ${missingKeyHashes.join(
        ', ',
      )}`,
    );
    this.name = 'TransactionUnderSignedError';
  }
}

/**
 * Fails closed unless every key hash the transaction requires (from its inputs,
 * withdrawals, certificates, votes, and native scripts) has a matching vkey
 * witness. Guards a multi-account sweep where one account's key agent could
 * silently fail to witness its own input: the merged witness set would then be
 * short a signature, the submit would be rejected, yet a bare-txId success path
 * would still report the sweep as done. `resolvedInputs` must include every UTxO
 * the transaction spends so input signers can be resolved.
 */
export const assertTransactionFullySigned = (
  signedTx: Serialization.Transaction,
  resolvedInputs: Cardano.Utxo[],
): void => {
  const required = getUniqueSignerKeyHashes(signedTx.toCore(), resolvedInputs);
  const witnessed = new Set<string>(
    (signedTx.witnessSet().vkeys()?.toCore() ?? []).map(([publicKey]) =>
      hashEd25519PublicKey(publicKey).toString(),
    ),
  );
  const missing = [...required].filter(keyHash => !witnessed.has(keyHash));
  if (missing.length > 0) {
    throw new TransactionUnderSignedError(missing);
  }
};
