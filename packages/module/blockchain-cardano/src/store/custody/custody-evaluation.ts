import { Serialization } from '@cardano-sdk/core';

import { failCustodyBuild } from './build-failure';
import {
  ExecutionEstimateShortfall,
  assembleWithFunds,
  atLeast,
  findUnderDeclaredBudgets,
  redeemerKey,
  unmeasured,
  withEvaluationMargin,
} from './custody-assembly';
import { evaluateCustodyTransaction } from './custody-chain';

import type { AssembleWithFundsParams } from './custody-assembly';
import type { CustodyChain } from './custody-chain';
import type { CustodyReseed } from './custody-execution-estimate';
import type { Cardano } from '@cardano-sdk/core';
import type { TxEvaluator } from '@cardano-sdk/tx-construction';

/** Rebuilds allowed after the final transaction measures above its budgets. */
const MAX_EVALUATION_ROUNDS = 3;

/**
 * Prices every redeemer at what the provider measures on the draft, with a
 * margin, and at least at a floor an earlier round measured on final bytes.
 */
export const createProviderEvaluator = (
  chain: CustodyChain,
  floors: ReadonlyMap<string, Cardano.ExUnits>,
): TxEvaluator => ({
  evaluate: async tx => {
    const measured = await evaluateCustodyTransaction(
      Serialization.Transaction.fromCore(tx),
      chain,
    );
    return (tx.witness.redeemers ?? []).map(({ purpose, index }) => {
      const measurement = measured.find(
        entry => entry.purpose === purpose && entry.index === index,
      );
      if (!measurement) return unmeasured({ purpose, index });
      return {
        purpose,
        index,
        budget: atLeast(
          withEvaluationMargin(measurement.budget),
          floors.get(redeemerKey({ purpose, index })),
        ),
      };
    });
  },
});

/**
 * Builds a transaction whose budgets come from provider evaluation, then
 * evaluates the final bytes. Every redeemer must declare at least what the
 * final transaction measures, which is what the sponsor service checks
 * before it signs; a shortfall raises the budget and rebuilds.
 *
 * Balancing prices the fee at the plan's execution estimate, so the funds,
 * or the control output that pays, need to cover little more than the real
 * fee. When the scripts measure above the estimate by more than the
 * balanced fee covers, the plan is built once more, seeded at the
 * measurement plus a margin: a second selection round, which may add fund
 * UTxOs.
 *
 * @throws `MaxBalancedFeeExceeded` when `maxBalancedFee` is set and the
 *   transaction needs a fee above it
 */
export const buildWithEvaluatedBudgets = async (
  params: Omit<AssembleWithFundsParams, 'evaluator' | 'reseed'>,
): Promise<Serialization.Transaction> => {
  let floors = new Map<string, Cardano.ExUnits>();
  let funds = params.funds;
  let reseed: CustodyReseed | undefined;
  for (let round = 1; ; ) {
    let built: Awaited<ReturnType<typeof assembleWithFunds>>;
    try {
      built = await assembleWithFunds({
        ...params,
        funds,
        reseed,
        evaluator: () => createProviderEvaluator(params.chain, floors),
      });
    } catch (error) {
      if (!(error instanceof ExecutionEstimateShortfall)) throw error;
      if (reseed) {
        return failCustodyBuild({
          code: 'script-evaluation-failed',
          message:
            'The scripts measure above the execution estimate after a reseed',
        });
      }
      reseed = error.reseed;
      continue;
    }
    funds = built.funds;
    const underDeclared = findUnderDeclaredBudgets(
      built.transaction,
      await evaluateCustodyTransaction(built.transaction, params.chain),
    );
    if (underDeclared.length === 0) return built.transaction;
    if (round >= MAX_EVALUATION_ROUNDS) {
      return failCustodyBuild({
        code: 'script-evaluation-failed',
        message: `Declared budgets stay below the measured ones after ${round} rounds`,
      });
    }
    round++;
    floors = new Map([
      ...floors,
      ...underDeclared.map(
        entry =>
          [redeemerKey(entry), withEvaluationMargin(entry.budget)] as const,
      ),
    ]);
  }
};
