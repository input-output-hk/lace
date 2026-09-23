import { Serialization } from '@cardano-sdk/core';
import { firstValueFrom } from 'rxjs';

import { boundedExUnitsEvaluator } from './bounded-ex-units-evaluator';

import type { Cardano } from '@cardano-sdk/core';
import type { TxEvaluator } from '@cardano-sdk/tx-construction';
import type {
  CardanoProvider,
  RedeemerExecutionUnits,
} from '@lace-contract/cardano-context';
import type { Logger } from 'ts-log';

// =====================================================================
// Provider-backed ex-units evaluator for the cNIGHT designation tx.
// =====================================================================
// Runs the draft through the node (Blockfrost's `/utils/txs/evaluate`)
// so each redeemer declares what it actually costs instead of the
// fixed budget in `bounded-ex-units-evaluator.ts`, which over-pays the
// fee by ~0.3-0.9 ADA across the redeemers.
//
// Every redeemer the evaluation does not cover — because the network
// declined to evaluate at all, or answered about only some of them —
// keeps that fixed budget. The fallback is safe because the budget is
// bounded against ONE known validator whose redeemers are tiny (a
// signature check, a singleton-NFT check, a rotation-list scan, a
// datum-shape check): 3 × the per-redeemer budget is ~43% of the
// Plutus V3 tx limit, so the worst case is the fee this build already
// charged before evaluation existed, never a rejected transaction.
// =====================================================================

/**
 * Padding on every evaluated budget. The builder rewrites the fee (and the
 * change output that absorbs it) AFTER evaluation, so the script context the
 * node executes is not byte-identical to the one it priced. Under-declaring
 * fails phase-2 and forfeits the collateral, so the difference is paid for
 * rather than gambled on.
 */
const EX_UNITS_MARGIN_PERCENT = 10;

const withMargin = (budget: Cardano.ExUnits): Cardano.ExUnits => ({
  memory: Math.ceil((budget.memory * (100 + EX_UNITS_MARGIN_PERCENT)) / 100),
  steps: Math.ceil((budget.steps * (100 + EX_UNITS_MARGIN_PERCENT)) / 100),
});

export type ProviderExUnitsEvaluatorDependencies = {
  cardanoProvider: Pick<CardanoProvider, 'evaluateTx'>;
  chainId: Cardano.ChainId;
  logger: Logger;
};

/**
 * A {@link TxEvaluator} that prices redeemers through the Cardano provider,
 * leaving any redeemer the provider did not price on the fixed budget
 * `boundedExUnitsEvaluator` assigns it.
 */
export const createProviderExUnitsEvaluator = ({
  cardanoProvider,
  chainId,
  logger,
}: ProviderExUnitsEvaluatorDependencies): TxEvaluator => {
  const evaluate = async (
    tx: Cardano.Tx,
  ): Promise<RedeemerExecutionUnits[] | undefined> => {
    try {
      const result = await firstValueFrom(
        cardanoProvider.evaluateTx(
          { tx: Serialization.Transaction.fromCore(tx).toCbor() },
          { chainId },
        ),
      );
      if (result.isOk()) return result.value;
      logger.warn(
        'cNIGHT designation: ex-units evaluation declined, using the bounded budget',
        result.error,
      );
    } catch (error) {
      logger.warn(
        'cNIGHT designation: ex-units evaluation failed, using the bounded budget',
        error,
      );
    }
    return undefined;
  };

  return {
    evaluate: async (tx, resolvedInputs) => {
      // The bounded evaluator supplies the shape — one entry per redeemer, the
      // builder rejects a missing one — and the floor each entry keeps.
      const bounded = await boundedExUnitsEvaluator.evaluate(
        tx,
        resolvedInputs,
      );
      if (bounded.length === 0) return bounded;

      const evaluated = await evaluate(tx);

      return bounded.map(entry => {
        const match = evaluated?.find(
          budget =>
            budget.purpose === entry.purpose && budget.index === entry.index,
        );
        return match ? { ...entry, budget: withMargin(match.budget) } : entry;
      });
    },
  };
};
