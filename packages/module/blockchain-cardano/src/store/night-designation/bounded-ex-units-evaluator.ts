import type { Cardano } from '@cardano-sdk/core';
import type { TxEvaluator } from '@cardano-sdk/tx-construction';

// =====================================================================
// Bounded ex-units evaluator for the cNIGHT designation tx.
// =====================================================================
// The SDK's local `GreedyTxEvaluator` assigns the *per-transaction* max
// to every redeemer, so a 2-redeemer tx (update / deregister) would
// declare ~2× the tx limit and be rejected at Phase-1. The cNIGHT
// validator's redeemers are tiny (a signature check, a singleton-NFT
// check, a rotation-list scan, a datum-shape check) — well under the
// budget below — so we feed `initializeTx` a fixed per-redeemer budget
// instead. It over-pays the fee by ~0.3–0.9 ADA across the redeemers,
// which the protocol accepts; this mirrors the budget the Carbon app
// ships. Swapping in a provider-backed evaluator (Ogmios / Blockfrost
// `/utils/txs/evaluate`) later is a drop-in on this same seam.
//
// Per-redeemer budget × at most 3 redeemers stays comfortably under the
// Plutus V3 mainnet tx limit (mem 14_000_000, steps 10_000_000_000):
//   3 × { mem: 2_000_000, steps: 700_000_000 } ≈ 43% of the tx limit.
// =====================================================================

export const BOUNDED_EX_UNITS_PER_REDEEMER: Cardano.ExUnits = {
  memory: 2_000_000,
  steps: 700_000_000,
};

/**
 * A {@link TxEvaluator} that returns a fixed, conservative budget for
 * every redeemer in the transaction (no network round-trip).
 */
export const boundedExUnitsEvaluator: TxEvaluator = {
  evaluate: async tx =>
    (tx.witness.redeemers ?? []).map(redeemer => ({
      purpose: redeemer.purpose,
      index: redeemer.index,
      budget: BOUNDED_EX_UNITS_PER_REDEEMER,
    })),
};
