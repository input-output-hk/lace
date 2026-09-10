import { Serialization } from '@cardano-sdk/core';

import type { Cardano } from '@cardano-sdk/core';

const MAX_CACHED_TRANSACTIONS = 32;

export interface ChainedTxOutputCache {
  /** Caches the outputs of a tx this wallet signed or submitted. */
  recordOwnTransaction(txCbor: string): void;
  /**
   * Synthetic UTxOs for the tx's inputs and collaterals that spend cached
   * outputs paying to one of `ownAddresses`. Callers append these to the
   * confirmed UTxO set; listing the confirmed set first keeps it
   * authoritative once the source tx lands on-chain. Foreign-address outputs
   * are never returned: consumers like the foreign-signature guard treat
   * utxo-set membership as ownership, so a foreign entry would let a
   * full-sign pass for inputs the wallet cannot witness.
   */
  resolveChainedInputs(
    txCbor: string,
    ownAddresses: ReadonlySet<string>,
  ): Cardano.Utxo[];
}

/**
 * Tracks outputs of transactions recently signed or submitted through the
 * dapp connector, so a chained tx spending an output of a still-in-mempool
 * predecessor can be recognized as spending from this wallet. The confirmed
 * UTxO store cannot resolve such inputs, which yields zero witnesses and a
 * ProofGeneration error.
 *
 * Bounded LRU (touch on record and on hit) with no TTL: confirmation is the
 * real invalidation signal and is handled by lookup precedence, not eviction.
 * Stale entries are harmless, since resolution only widens which signing keys
 * are attempted and key-path mapping still filters by the signing account's
 * known addresses.
 */
export const createChainedTxOutputCache = (): ChainedTxOutputCache => {
  const outputsByTxId = new Map<Cardano.TransactionId, Cardano.Utxo[]>();

  const touch = (txId: Cardano.TransactionId, utxos: Cardano.Utxo[]) => {
    outputsByTxId.delete(txId);
    outputsByTxId.set(txId, utxos);
    if (outputsByTxId.size > MAX_CACHED_TRANSACTIONS) {
      outputsByTxId.delete(outputsByTxId.keys().next().value!);
    }
  };

  return {
    recordOwnTransaction: (txCbor: string): void => {
      try {
        const tx = Serialization.Transaction.fromCbor(
          Serialization.TxCBOR(txCbor),
        );
        const txId = tx.getId();
        const utxos = tx
          .toCore()
          .body.outputs.map(
            (txOut, index): Cardano.Utxo => [
              { txId, index, address: txOut.address },
              txOut,
            ],
          );
        touch(txId, utxos);
      } catch {
        return;
      }
    },
    resolveChainedInputs: (
      txCbor: string,
      ownAddresses: ReadonlySet<string>,
    ): Cardano.Utxo[] => {
      try {
        const { inputs, collaterals } = Serialization.Transaction.fromCbor(
          Serialization.TxCBOR(txCbor),
        ).toCore().body;
        const resolved: Cardano.Utxo[] = [];
        for (const input of [...inputs, ...(collaterals ?? [])]) {
          const utxos = outputsByTxId.get(input.txId);
          if (!utxos) continue;
          touch(input.txId, utxos);
          const match = utxos.find(([txIn]) => txIn.index === input.index);
          if (match && ownAddresses.has(match[1].address)) resolved.push(match);
        }
        return resolved;
      } catch {
        return [];
      }
    },
  };
};
