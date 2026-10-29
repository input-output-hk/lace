import { estimateSignedTxSize } from '../estimate-signed-tx-size';

import { referenceScriptSize } from './reference-scripts';

import type { Cardano, Serialization } from '@cardano-sdk/core';

/**
 * Conway's cap on the reference-script bytes one transaction reads, summed
 * over its spent and reference inputs. A ledger constant, not a protocol
 * parameter.
 */
const MAX_REFERENCE_SCRIPT_SIZE_PER_TX = 204_800;

/** The protocol limits a built transaction must stay within to be accepted. */
type TransactionLimits = Pick<
  Cardano.ProtocolParameters,
  'maxExecutionUnitsPerTransaction' | 'maxTxSize'
>;

/** What a transaction consumes of each {@link TransactionLimits} entry. */
export type TransactionLimitsUsage = {
  /** Execution units summed over every redeemer in the witness set. */
  executionUnits: Cardano.ExUnits;
  /** Estimated byte size once every required signer has witnessed it. */
  signedTxSize: number;
  /** Reference-script bytes read from the spent and reference inputs. */
  referenceScriptSize: number;
};

export type ExceededTransactionLimit =
  | 'executionMemory'
  | 'executionSteps'
  | 'referenceScriptSize'
  | 'txSize';

/** A built transaction would be refused by the ledger for exceeding a limit. */
export class TransactionLimitsExceededError extends Error {
  public constructor(
    readonly exceeded: ExceededTransactionLimit[],
    readonly usage: TransactionLimitsUsage,
    readonly limits: TransactionLimits,
  ) {
    super(
      `Transaction exceeds protocol limits (${exceeded.join(
        ', ',
      )}): execution units ${usage.executionUnits.memory}/${
        limits.maxExecutionUnitsPerTransaction.memory
      } memory, ${usage.executionUnits.steps}/${
        limits.maxExecutionUnitsPerTransaction.steps
      } steps; signed size ${usage.signedTxSize}/${
        limits.maxTxSize
      } bytes; reference scripts ${
        usage.referenceScriptSize
      }/${MAX_REFERENCE_SCRIPT_SIZE_PER_TX} bytes`,
    );
    this.name = 'TransactionLimitsExceededError';
  }
}

/**
 * Checks a built transaction against the per-transaction execution-unit,
 * size and reference-script limits, which `TransactionBuilder` does not
 * enforce. Run it on the final (evaluated) transaction. The size is measured
 * with one vkey witness per required signer, so `resolvedInputs` must resolve
 * every input and collateral input, as for `estimateSignedTxSize`. It must
 * also resolve every reference input, whose scripts count toward the
 * reference-script limit.
 *
 * @returns The measured usage when every limit holds.
 * @throws `TransactionLimitsExceededError` When any limit is exceeded.
 */
export const assertWithinTransactionLimits = (
  tx: Serialization.Transaction,
  resolvedInputs: Cardano.Utxo[],
  limits: TransactionLimits,
): TransactionLimitsUsage => {
  const redeemers = tx.witnessSet().redeemers()?.toCore() ?? [];
  const body = tx.body().toCore();
  const usage: TransactionLimitsUsage = {
    executionUnits: redeemers.reduce(
      (total, { executionUnits }) => ({
        memory: total.memory + executionUnits.memory,
        steps: total.steps + executionUnits.steps,
      }),
      { memory: 0, steps: 0 },
    ),
    signedTxSize: estimateSignedTxSize(tx, resolvedInputs),
    referenceScriptSize: referenceScriptSize(
      [...body.inputs, ...(body.referenceInputs ?? [])],
      resolvedInputs,
    ),
  };

  const exceeded: ExceededTransactionLimit[] = [];
  if (
    usage.executionUnits.memory > limits.maxExecutionUnitsPerTransaction.memory
  ) {
    exceeded.push('executionMemory');
  }
  if (
    usage.executionUnits.steps > limits.maxExecutionUnitsPerTransaction.steps
  ) {
    exceeded.push('executionSteps');
  }
  if (usage.signedTxSize > limits.maxTxSize) exceeded.push('txSize');
  if (usage.referenceScriptSize > MAX_REFERENCE_SCRIPT_SIZE_PER_TX) {
    exceeded.push('referenceScriptSize');
  }

  if (exceeded.length > 0) {
    throw new TransactionLimitsExceededError(exceeded, usage, limits);
  }
  return usage;
};
