import {
  Cardano,
  ProviderError,
  ProviderFailure,
  Serialization,
} from '@cardano-sdk/core';
import { describe, expect, it, vi } from 'vitest';

import { CustodyBuildFailure } from '../../../src/store/custody/build-failure';
import {
  FundShortfall,
  controlOutputOf,
  findUnderDeclaredBudgets,
  leastFeeOf,
  plannedFeeOf,
  resolvedInputsOf,
  restorePlannedOutputs,
  selectFunds,
  withCoins,
  withOutputs,
} from '../../../src/store/custody/custody-assembly';
import {
  createSlotClock,
  evaluateCustodyTransaction,
} from '../../../src/store/custody/custody-chain';
import { createProviderEvaluator } from '../../../src/store/custody/custody-evaluation';

import {
  accountState,
  chainId,
  eraSummaries,
  fakeProvider,
  fundUtxo,
  identity,
  parkedScriptUtxos,
  protocolParameters,
  recipientAddress,
  sponsorAddress,
  version,
} from './fixtures';

import type { EraSummary } from '@cardano-sdk/core';

const TOKEN = Cardano.AssetId(`${'99'.repeat(28)}746f6b656e`);

const withToken = (seed: number, coins: bigint, quantity: bigint) =>
  fundUtxo(seed, coins, {
    value: { coins, assets: new Map([[TOKEN, quantity]]) },
  });

const seeds = (utxos: readonly Cardano.Utxo[]) =>
  utxos.map(([input]) => Number.parseInt(input.txId, 16));

describe('selectFunds', () => {
  it('takes the largest UTxOs until the lovelace is covered', () => {
    const { selected, remaining } = selectFunds(
      [
        fundUtxo(1, 2_000_000n),
        fundUtxo(2, 9_000_000n),
        fundUtxo(3, 5_000_000n),
      ],
      { coins: 12_000_000n },
    );
    expect(seeds(selected)).toEqual([2, 3]);
    expect(seeds(remaining)).toEqual([1]);
  });

  it('takes the UTxOs holding most of a requested asset first', () => {
    const { selected } = selectFunds(
      [
        fundUtxo(1, 50_000_000n),
        withToken(2, 2_000_000n, 3n),
        withToken(3, 2_000_000n, 8n),
        withToken(4, 3_000_000n, 8n),
      ],
      { coins: 0n, assets: new Map([[TOKEN, 10n]]) },
    );
    expect(seeds(selected)).toEqual([4, 3]);
  });

  it('counts an asset the lovelace selection already took', () => {
    const { selected } = selectFunds(
      [withToken(1, 9_000_000n, 5n), fundUtxo(2, 1_000_000n)],
      { coins: 1_000_000n, assets: new Map([[TOKEN, 5n]]) },
    );
    expect(seeds(selected)).toEqual([1]);
  });

  it('takes reserves only after every fund', () => {
    const { selected, remaining } = selectFunds(
      [fundUtxo(1, 2_000_000n), fundUtxo(2, 1_000_000n)],
      { coins: 4_000_000n },
      [fundUtxo(3, 9_000_000n), fundUtxo(4, 5_000_000n)],
    );
    expect(seeds(selected)).toEqual([1, 2, 3]);
    expect(seeds(remaining)).toEqual([4]);
  });

  it('takes a fund holding a requested asset before a reserve holding as much', () => {
    const { selected } = selectFunds(
      [withToken(1, 2_000_000n, 5n)],
      { coins: 0n, assets: new Map([[TOKEN, 5n]]) },
      [withToken(2, 9_000_000n, 5n)],
    );
    expect(seeds(selected)).toEqual([1]);
  });

  it('hands every UTxO to the build when an asset cannot be covered', () => {
    const { selected, remaining } = selectFunds(
      [withToken(1, 2_000_000n, 1n), fundUtxo(2, 5_000_000n)],
      { coins: 0n, assets: new Map([[TOKEN, 10n]]) },
    );
    expect(seeds(selected)).toEqual([1, 2]);
    expect(remaining).toEqual([]);
  });
});

describe('restorePlannedOutputs', () => {
  const control = (coins: bigint) =>
    controlOutputOf(identity, accountState(), coins);
  const change = (coins: bigint): Cardano.TxOut => ({
    address: identity.address,
    value: { coins },
  });
  const grant = (coins: bigint): Cardano.TxOut => ({
    ...change(coins),
    datum: 1n,
  });
  const collateralReturn = (coins: bigint): Cardano.TxOut => ({
    address: sponsorAddress,
    value: { coins },
  });
  const transactionWith = (
    outputs: Cardano.TxOut[],
    collateral: Partial<Cardano.TxBody> = {},
  ) =>
    Serialization.Transaction.fromCore({
      id: '0'.repeat(64) as Cardano.TransactionId,
      body: {
        inputs: [{ txId: '1'.repeat(64) as Cardano.TransactionId, index: 0 }],
        outputs,
        fee: 200_000n,
        ...collateral,
      },
      witness: { signatures: new Map() },
    });
  const plan = (...outputs: Cardano.TxOut[]) => ({
    changeAddress: identity.address,
    outputs,
  });
  /** Just below 2^32 lovelace, where a coin takes five CBOR bytes, not nine. */
  const BELOW_WIDTH = 2n ** 32n - 1000n;

  it('keeps a transaction whose planned outputs hold their lovelace', () => {
    const tx = transactionWith([control(2_000_000n), change(5_000_000n)]);
    expect(
      restorePlannedOutputs(tx, plan(control(2_000_000n)), protocolParameters),
    ).toBe(tx);
  });

  it('moves a fee saving from a planned output to the largest change', () => {
    const tx = transactionWith([
      control(2_500_000n),
      grant(1_700_000n),
      { address: recipientAddress, value: { coins: 9_000_000n } },
      change(1_000_000n),
      change(1_200_000n),
    ]);
    const outputs = restorePlannedOutputs(
      tx,
      plan(control(2_000_000n), grant(1_600_000n), {
        address: recipientAddress,
        value: { coins: 9_000_000n },
      }),
      protocolParameters,
    )
      .body()
      .toCore().outputs;
    expect(outputs.map(({ value }) => value.coins)).toEqual([
      2_000_000n,
      1_600_000n,
      9_000_000n,
      1_000_000n,
      1_800_000n,
    ]);
  });

  it('asks for another fund UTxO when there is no change to take the saving', () => {
    const tx = transactionWith([
      control(2_500_000n),
      { address: recipientAddress, value: { coins: 9_000_000n } },
    ]);
    expect(() =>
      restorePlannedOutputs(tx, plan(control(2_000_000n)), protocolParameters),
    ).toThrow(FundShortfall);
  });

  it('keeps the saving in the fee when crediting the change would grow the body', () => {
    const tx = transactionWith([control(2_100_000n), change(BELOW_WIDTH)]);
    const restored = restorePlannedOutputs(
      tx,
      plan(control(2_000_000n)),
      protocolParameters,
    );
    const { outputs, fee } = restored.body().toCore();
    expect(outputs.map(({ value }) => value.coins)).toEqual([
      2_000_000n,
      BELOW_WIDTH,
    ]);
    expect(fee).toBe(200_000n + 100_000n);
    expect(restored.body().toCbor().length).toBeLessThanOrEqual(
      tx.body().toCbor().length,
    );
  });

  it('raises the declared collateral with the fee, from the collateral return', () => {
    const tx = transactionWith([control(2_100_000n), change(BELOW_WIDTH)], {
      totalCollateral: 300_000n,
      collateralReturn: collateralReturn(4_700_000n),
    });
    const {
      fee,
      totalCollateral,
      collateralReturn: returned,
    } = restorePlannedOutputs(tx, plan(control(2_000_000n)), protocolParameters)
      .body()
      .toCore();
    expect(fee).toBe(300_000n);
    // 150 percent of the raised fee.
    expect(totalCollateral).toBe(450_000n);
    expect(returned?.value.coins).toBe(4_550_000n);
  });

  it('refuses to keep the saving in a fee the collateral return cannot cover', () => {
    const tx = transactionWith([control(2_100_000n), change(BELOW_WIDTH)], {
      totalCollateral: 300_000n,
      collateralReturn: collateralReturn(1_000_000n),
    });
    expect(() =>
      restorePlannedOutputs(tx, plan(control(2_000_000n)), protocolParameters),
    ).toThrow(CustodyBuildFailure);
  });
});

describe('withOutputs', () => {
  it('refuses to credit a planned output across a CBOR width the fee was not priced for', () => {
    const tx = Serialization.Transaction.fromCore({
      id: '0'.repeat(64) as Cardano.TransactionId,
      body: {
        inputs: [{ txId: '1'.repeat(64) as Cardano.TransactionId, index: 0 }],
        outputs: [controlOutputOf(identity, accountState(), 2n ** 32n - 1n)],
        fee: 200_000n,
      },
      witness: { signatures: new Map() },
    });
    const [output] = tx.body().toCore().outputs;
    expect(() => withOutputs(tx, [withCoins(output, 2n ** 32n)])).toThrow(
      CustodyBuildFailure,
    );
  });
});

describe('fee floors', () => {
  const plan = {
    scripts: [version.accountValidator],
    referenceInputs: parkedScriptUtxos.slice(1),
    executionEstimate: { memory: 1_000_000, steps: 400_000_000 },
  };

  it('prices attached scripts by size and referenced scripts at the reference-script price', () => {
    const attachedBytes = BigInt(version.accountValidator.bytes.length / 2);
    const [[, logicUtxo]] = parkedScriptUtxos.slice(1);
    // The tagged CBOR of a Plutus V3 script: its bytes, their header and the tag.
    const referencedBytes = BigInt(
      Serialization.Script.fromCore(logicUtxo.scriptReference!).toCbor()
        .length / 2,
    );
    expect(leastFeeOf(plan, protocolParameters)).toBe(
      BigInt(protocolParameters.minFeeConstant) +
        BigInt(protocolParameters.minFeeCoefficient) * attachedBytes +
        15n * referencedBytes,
    );
  });

  it('adds the execution estimate to the least fee for the planned fee', () => {
    expect(
      plannedFeeOf(plan, protocolParameters) -
        leastFeeOf(plan, protocolParameters),
    ).toBe(
      BigInt(
        Math.ceil(
          protocolParameters.prices.memory * 1_000_000 +
            protocolParameters.prices.steps * 400_000_000,
        ),
      ),
    );
  });
});

describe('createSlotClock', () => {
  const eras = [
    {
      parameters: { epochLength: 100, slotLength: 20_000 },
      start: { slot: 0, time: new Date(1_000_000) },
    },
    {
      parameters: { epochLength: 1000, slotLength: 1000 },
      start: { slot: 100, time: new Date(3_000_000) },
    },
  ] as unknown as EraSummary[];
  const clock = createSlotClock(eras);

  it('converts within each era', () => {
    expect(clock.slotAt(1_040_000)).toBe(2);
    expect(clock.slotStart(Cardano.Slot(2))).toBe(1_040_000);
    expect(clock.slotAt(3_005_500)).toBe(105);
    expect(clock.slotStart(Cardano.Slot(105))).toBe(3_005_000);
  });

  it('reads a time before the first era in the first era', () => {
    expect(clock.slotAt(960_000)).toBe(-2);
  });
});

describe('createProviderEvaluator', () => {
  it('prices nothing for a transaction without redeemers', async () => {
    const { provider } = fakeProvider();
    const evaluator = createProviderEvaluator(
      {
        chainId,
        protocolParameters,
        clock: createSlotClock(eraSummaries),
        now: Date.now(),
        provider: provider as never,
      },
      new Map(),
    );
    expect(
      await evaluator.evaluate(
        {
          id: '0'.repeat(64) as Cardano.TransactionId,
          body: { inputs: [], outputs: [], fee: 0n },
          witness: { signatures: new Map() },
        },
        [],
      ),
    ).toEqual([]);
  });
});

describe('evaluateCustodyTransaction', () => {
  const transaction = Serialization.Transaction.fromCore({
    id: '0'.repeat(64) as Cardano.TransactionId,
    body: { inputs: [], outputs: [], fee: 0n },
    witness: { signatures: new Map() },
  });
  const failure = (reason: ProviderFailure) =>
    new ProviderError(reason, undefined, 'evaluation');

  /** Evaluates against a provider answering with `answers` in turn, retries elapsed. */
  const evaluateWith = async (answers: (Error | [])[]) => {
    const { provider } = fakeProvider({
      evaluate: () => answers.shift() ?? [],
    });
    vi.useFakeTimers();
    try {
      const outcome = evaluateCustodyTransaction(transaction, {
        chainId,
        protocolParameters,
        clock: createSlotClock(eraSummaries),
        now: Date.now(),
        provider: provider as never,
      }).then(
        measured => ({ measured }),
        (error: unknown) => ({
          failure: (error as CustodyBuildFailure).reason,
        }),
      );
      await vi.runAllTimersAsync();
      return {
        ...(await outcome),
        calls: provider.evaluateTx.mock.calls.length,
      };
    } finally {
      vi.useRealTimers();
    }
  };

  it('retries a transient failure and returns the measurement once the provider answers', async () => {
    expect(
      await evaluateWith([
        failure(ProviderFailure.ServerUnavailable),
        failure(ProviderFailure.ConnectionFailure),
      ]),
    ).toEqual({ measured: [], calls: 3 });
  });

  it('reports a connection that keeps failing as unavailable, not as a script failure', async () => {
    const connection = failure(ProviderFailure.ConnectionFailure);
    expect(
      await evaluateWith([connection, connection, connection, connection]),
    ).toEqual({
      failure: {
        code: 'unavailable',
        message: `Transaction evaluation: ${connection.message}`,
      },
      calls: 4,
    });
  });

  it('reports a rate limit that outlasts the retries as unavailable', async () => {
    const limited = failure(ProviderFailure.ServerUnavailable);
    expect(
      await evaluateWith([limited, limited, limited, limited]),
    ).toMatchObject({ failure: { code: 'unavailable' }, calls: 4 });
  });

  it('reports a script failure at once, without retrying', async () => {
    const refused = failure(ProviderFailure.InvalidResponse);
    expect(await evaluateWith([refused])).toEqual({
      failure: { code: 'script-evaluation-failed', message: refused.message },
      calls: 1,
    });
  });
});

describe('transaction helpers', () => {
  const emptyTransaction: Cardano.Tx = {
    id: '0'.repeat(64) as Cardano.TransactionId,
    body: {
      inputs: [{ txId: '1'.repeat(64) as Cardano.TransactionId, index: 0 }],
      outputs: [],
      fee: 0n,
    },
    witness: { signatures: new Map() },
  };

  it('finds nothing under-declared in a transaction without redeemers', () => {
    expect(
      findUnderDeclaredBudgets(
        Serialization.Transaction.fromCore(emptyTransaction),
        [],
      ),
    ).toEqual([]);
  });

  it('resolves the inputs of a transaction without collateral', () => {
    const fund = fundUtxo(1, 1_000_000n);
    expect(
      resolvedInputsOf(
        Serialization.Transaction.fromCore({
          ...emptyTransaction,
          body: { ...emptyTransaction.body, inputs: [fund[0]] },
        }),
        [fund, fundUtxo(2, 1_000_000n)],
      ),
    ).toEqual([fund]);
  });

  it('resolves reference inputs after the inputs and before the collateral', () => {
    const fund = fundUtxo(1, 1_000_000n);
    const referenced = fundUtxo(2, 1_000_000n);
    const collateral = fundUtxo(3, 5_000_000n);
    expect(
      resolvedInputsOf(
        Serialization.Transaction.fromCore({
          ...emptyTransaction,
          body: {
            ...emptyTransaction.body,
            inputs: [fund[0]],
            referenceInputs: [referenced[0]],
            collaterals: [collateral[0]],
          },
        }),
        [collateral, referenced, fund],
      ),
    ).toEqual([fund, referenced, collateral]);
  });
});
