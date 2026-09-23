import {
  Cardano,
  ProviderError,
  ProviderFailure,
  Serialization,
} from '@cardano-sdk/core';
import { Err, Ok } from '@lace-lib/util';
import { of, throwError } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { BOUNDED_EX_UNITS_PER_REDEEMER } from '../../../src/store/night-designation/bounded-ex-units-evaluator';
import { createProviderExUnitsEvaluator } from '../../../src/store/night-designation/provider-ex-units-evaluator';

import type { RedeemerExecutionUnits } from '@lace-contract/cardano-context';

// =====================================================================
// The designation build declares what the network prices its redeemers
// at, and keeps the bounded budget for every redeemer that price never
// covers. These assert the second half as hard as the first: an
// evaluation the network declines must not fail the build, and must
// not leave a redeemer without a budget (the tx builder rejects one).
// =====================================================================

const chainId: Cardano.ChainId = {
  networkId: Cardano.NetworkId.Testnet,
  networkMagic: 2,
};

const redeemer = (
  purpose: Cardano.RedeemerPurpose,
  index: number,
): Cardano.Redeemer => ({
  purpose,
  index,
  data: 42n,
  executionUnits: { memory: 0, steps: 0 },
});

/**
 * A minimal but serialisable transaction — the evaluator hands the provider
 * CBOR, so a core tx that cannot round-trip would test nothing.
 */
const tx = (redeemers: Cardano.Redeemer[]): Cardano.Tx =>
  ({
    id: Cardano.TransactionId('00'.repeat(32)),
    body: {
      inputs: [
        {
          txId: Cardano.TransactionId('11'.repeat(32)),
          index: 0,
        },
      ],
      outputs: [],
      fee: 200_000n,
    },
    witness: { signatures: new Map(), redeemers },
  } as Cardano.Tx);

const mintAndSpend = tx([
  redeemer(Cardano.RedeemerPurpose.mint, 0),
  redeemer(Cardano.RedeemerPurpose.spend, 1),
]);

const evaluated: RedeemerExecutionUnits[] = [
  {
    purpose: Cardano.RedeemerPurpose.mint,
    index: 0,
    budget: { memory: 500_000, steps: 160_000_000 },
  },
  {
    purpose: Cardano.RedeemerPurpose.spend,
    index: 1,
    budget: { memory: 700_000, steps: 230_000_000 },
  },
];

const makeEvaluator = (
  evaluateTx: ReturnType<typeof vi.fn>,
  logger = dummyLogger,
) =>
  createProviderExUnitsEvaluator({
    cardanoProvider: { evaluateTx } as never,
    chainId,
    logger,
  });

describe('createProviderExUnitsEvaluator', () => {
  it('declares the evaluated budget, padded, for every priced redeemer', async () => {
    const evaluateTx = vi.fn(() => of(Ok(evaluated)));

    const result = await makeEvaluator(evaluateTx).evaluate(mintAndSpend, []);

    // 10% margin: the fee correction that follows evaluation rewrites the body
    // the node re-executes, so the declared budget is not the priced one.
    expect(result).toEqual([
      {
        purpose: Cardano.RedeemerPurpose.mint,
        index: 0,
        budget: { memory: 550_000, steps: 176_000_000 },
      },
      {
        purpose: Cardano.RedeemerPurpose.spend,
        index: 1,
        budget: { memory: 770_000, steps: 253_000_000 },
      },
    ]);
  });

  it('sends the transaction CBOR to the provider for the chain being built', async () => {
    const evaluateTx = vi.fn(() => of(Ok(evaluated)));

    await makeEvaluator(evaluateTx).evaluate(mintAndSpend, []);

    expect(evaluateTx).toHaveBeenCalledTimes(1);
    const [props, context] = evaluateTx.mock.calls[0] as unknown as [
      { tx: string },
      { chainId: Cardano.ChainId },
    ];
    expect(context).toEqual({ chainId });
    // Round-tripped rather than string-matched: the provider is handed the
    // transaction it must price, not merely something hex-shaped.
    const sent = Serialization.Transaction.fromCbor(
      props.tx as Serialization.TxCBOR,
    ).toCore();
    expect(sent.witness.redeemers).toHaveLength(2);
  });

  it('keeps the bounded budget for every redeemer when the provider declines to evaluate', async () => {
    const evaluateTx = vi.fn(() =>
      of(
        Err(
          new ProviderError(
            ProviderFailure.InvalidResponse,
            undefined,
            'EvaluationFailure',
          ),
        ),
      ),
    );

    const result = await makeEvaluator(evaluateTx).evaluate(mintAndSpend, []);

    expect(result).toEqual([
      {
        purpose: Cardano.RedeemerPurpose.mint,
        index: 0,
        budget: BOUNDED_EX_UNITS_PER_REDEEMER,
      },
      {
        purpose: Cardano.RedeemerPurpose.spend,
        index: 1,
        budget: BOUNDED_EX_UNITS_PER_REDEEMER,
      },
    ]);
  });

  it('keeps the bounded budget when the provider call fails outright', async () => {
    const evaluateTx = vi.fn(() =>
      throwError(() => new Error('blockfrost unreachable')),
    );

    const result = await makeEvaluator(evaluateTx).evaluate(mintAndSpend, []);

    expect(result.map(entry => entry.budget)).toEqual([
      BOUNDED_EX_UNITS_PER_REDEEMER,
      BOUNDED_EX_UNITS_PER_REDEEMER,
    ]);
  });

  it('logs the reason a build fell back rather than silently over-paying', async () => {
    const logger = { ...dummyLogger, warn: vi.fn() };
    const evaluateTx = vi.fn(() => throwError(() => new Error('boom')));

    await makeEvaluator(evaluateTx, logger).evaluate(mintAndSpend, []);

    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('keeps the bounded budget for a redeemer the evaluation left out', async () => {
    const evaluateTx = vi.fn(() => of(Ok([evaluated[0]])));

    const result = await makeEvaluator(evaluateTx).evaluate(mintAndSpend, []);

    expect(result[0].budget).toEqual({ memory: 550_000, steps: 176_000_000 });
    expect(result[1].budget).toEqual(BOUNDED_EX_UNITS_PER_REDEEMER);
  });

  it('does not call the provider for a transaction with no redeemers', async () => {
    const evaluateTx = vi.fn(() => of(Ok(evaluated)));

    const result = await makeEvaluator(evaluateTx).evaluate(tx([]), []);

    expect(result).toEqual([]);
    expect(evaluateTx).not.toHaveBeenCalled();
  });
});
