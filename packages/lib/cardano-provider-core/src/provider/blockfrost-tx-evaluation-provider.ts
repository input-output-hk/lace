import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { Err, Ok } from '@lace-lib/util';
import { from } from 'rxjs';

import { BlockfrostProvider } from '../blockfrost-provider';

import type {
  EvaluateTxProps,
  RedeemerExecutionUnits,
} from '@lace-contract/cardano-context';
import type { Result } from '@lace-lib/util';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

// =====================================================================
// Blockfrost `POST /utils/txs/evaluate` — Ogmios' EvaluateTx, proxied.
// =====================================================================
// Blockfrost forwards the node's answer in whichever Ogmios dialect the
// `version` query parameter selects (it defaults to 5), so BOTH shapes
// are parsed: an endpoint that starts answering in v6 must not silently
// disable evaluation and leave every caller on its fallback budget.
//
//   v5: { result: { EvaluationResult: { "spend:0": { memory, steps } } } }
//   v6: { result: [ { validator: { purpose: "spend", index: 0 },
//                     budget: { memory, cpu } } ] }
//
// v6 also renames two purposes (`publish` for certificate, `withdraw`
// for withdrawal) and the steps field (`cpu`), which is why the maps
// below accept either spelling.
//
// The body is the transaction CBOR as a HEX STRING under
// `Content-Type: application/cbor` — what Blockfrost's own client
// posts; the raw bytes `tx/submit` takes are rejected here.
// =====================================================================

type BlockfrostBudget = {
  memory?: unknown;
  steps?: unknown;
  cpu?: unknown;
};

type BlockfrostEvaluationEntry = {
  validator?: string | { purpose?: string; index?: number };
  budget?: BlockfrostBudget;
  ex_units?: BlockfrostBudget;
};

const REDEEMER_PURPOSE_BY_NAME: Record<string, Cardano.RedeemerPurpose> = {
  spend: Cardano.RedeemerPurpose.spend,
  mint: Cardano.RedeemerPurpose.mint,
  certificate: Cardano.RedeemerPurpose.certificate,
  publish: Cardano.RedeemerPurpose.certificate,
  withdrawal: Cardano.RedeemerPurpose.withdrawal,
  withdraw: Cardano.RedeemerPurpose.withdrawal,
  vote: Cardano.RedeemerPurpose.vote,
  propose: Cardano.RedeemerPurpose.propose,
};

const toExUnits = (budget: unknown): Cardano.ExUnits | undefined => {
  if (typeof budget !== 'object' || budget === null) return undefined;
  const { memory, steps, cpu } = budget as BlockfrostBudget;
  const stepsValue =
    typeof steps === 'number'
      ? steps
      : typeof cpu === 'number'
      ? cpu
      : undefined;
  if (typeof memory !== 'number' || stepsValue === undefined) return undefined;
  return { memory, steps: stepsValue };
};

/** `"<purpose>:<index>"` (v5) or a `{ purpose, index }` object (v6). */
const toRedeemerRef = (
  validator: string | { purpose?: string; index?: number } | undefined,
): { purpose: Cardano.RedeemerPurpose; index: number } | undefined => {
  const { name, index } =
    typeof validator === 'string'
      ? {
          name: validator.split(':')[0],
          index: Number(validator.split(':')[1] ?? '0'),
        }
      : { name: validator?.purpose, index: validator?.index ?? 0 };
  const purpose = REDEEMER_PURPOSE_BY_NAME[name?.toLowerCase() ?? ''];
  if (!purpose || !Number.isInteger(index)) return undefined;
  return { purpose, index };
};

const fromEvaluationResult = (
  evaluationResult: Record<string, unknown>,
): RedeemerExecutionUnits[] =>
  Object.entries(evaluationResult).flatMap(([key, value]) => {
    const ref = toRedeemerRef(key);
    const budget = toExUnits(value);
    return ref && budget ? [{ ...ref, budget }] : [];
  });

const fromEvaluationEntries = (
  entries: readonly BlockfrostEvaluationEntry[],
): RedeemerExecutionUnits[] =>
  entries.flatMap(entry => {
    const ref = toRedeemerRef(entry.validator);
    const budget = toExUnits(entry.budget ?? entry.ex_units);
    return ref && budget ? [{ ...ref, budget }] : [];
  });

/**
 * An empty list only for a collection that was itself empty. A NON-EMPTY
 * collection none of whose entries parsed is a dialect this parser does not
 * know, not a transaction without redeemers — reporting it as `[]` would spend
 * the contract's "no redeemers" answer on the drift this dual parser exists to
 * surface.
 */
const parsedOrUnrecognised = (
  sourceCount: number,
  parsed: RedeemerExecutionUnits[],
): RedeemerExecutionUnits[] | undefined =>
  sourceCount > 0 && parsed.length === 0 ? undefined : parsed;

/**
 * Both dialects, unwrapped from the optional `result` envelope. `undefined`
 * distinguishes "this is not an evaluation" (a fault, an `EvaluationFailure`,
 * an unknown shape, a known envelope carrying only unreadable entries) from a
 * transaction that carries no redeemers, which legitimately evaluates to an
 * empty list.
 */
const parseEvaluation = (
  data: unknown,
): RedeemerExecutionUnits[] | undefined => {
  const body: unknown =
    typeof data === 'object' && data !== null && 'result' in data
      ? (data as { result: unknown }).result
      : data;

  if (Array.isArray(body)) {
    const entries = body as BlockfrostEvaluationEntry[];
    return parsedOrUnrecognised(entries.length, fromEvaluationEntries(entries));
  }
  if (typeof body === 'object' && body !== null) {
    const { EvaluationResult: evaluationResult } = body as {
      EvaluationResult?: unknown;
    };
    if (typeof evaluationResult === 'object' && evaluationResult !== null) {
      const result = evaluationResult as Record<string, unknown>;
      return parsedOrUnrecognised(
        Object.keys(result).length,
        fromEvaluationResult(result),
      );
    }
  }
  return undefined;
};

/** Truncated so a multi-kilobyte script trace cannot flood the log or the error. */
const describeUnusableResponse = (data: unknown): string => {
  try {
    return JSON.stringify(data)?.slice(0, 500) ?? 'undefined';
  } catch {
    return String(data);
  }
};

export class BlockfrostTxEvaluationProvider extends BlockfrostProvider {
  public constructor(client: HttpClient, logger: Logger) {
    super(client, logger);
  }

  /**
   * Evaluate a transaction's per-redeemer execution units.
   *
   * @param tx transaction CBOR (unsigned is fine)
   * @returns Observable with the per-redeemer budgets, or an error when the
   * network declined to evaluate (script failure, provider fault, HTTP error).
   */
  public evaluateTx({
    tx,
  }: EvaluateTxProps): Observable<
    Result<RedeemerExecutionUnits[], ProviderError>
  > {
    return from(
      this.request<unknown>('utils/txs/evaluate', {
        body: tx,
        headers: { 'Content-Type': 'application/cbor' },
        method: 'POST',
      })
        .then((data): Result<RedeemerExecutionUnits[], ProviderError> => {
          const evaluated = parseEvaluation(data);
          if (evaluated) return Ok(evaluated);

          // A 200 carrying an Ogmios fault / EvaluationFailure, or a shape
          // this parser does not know. Logged in full-ish so the dialect can
          // be added rather than guessed at from a caller's fallback.
          const detail = describeUnusableResponse(data);
          this.logger.warn('evaluateTx: no evaluation in response', detail);
          return Err(
            new ProviderError(
              ProviderFailure.InvalidResponse,
              undefined,
              detail,
            ),
          );
        })
        .catch(
          (error): Result<RedeemerExecutionUnits[], ProviderError> =>
            Err(error as ProviderError),
        ),
    );
  }
}
