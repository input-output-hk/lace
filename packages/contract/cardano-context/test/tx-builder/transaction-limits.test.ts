import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import { estimateSignedTxSize } from '../../src/estimate-signed-tx-size';
import {
  assertWithinTransactionLimits,
  TransactionLimitsExceededError,
} from '../../src/tx-builder/transaction-limits';

const ADDRESS =
  'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz' as Cardano.PaymentAddress;
const OTHER_KEY_ADDRESS =
  'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95' as Cardano.PaymentAddress;
const TX_ID = Cardano.TransactionId('ab'.repeat(32));
const resolvedInputs: Cardano.Utxo[] = [
  [
    { txId: TX_ID, index: 0, address: ADDRESS },
    { address: ADDRESS, value: { coins: 10_000_000n } },
  ],
];

const redeemer = (
  purpose: Cardano.RedeemerPurpose,
  executionUnits: Cardano.ExUnits,
): Cardano.Redeemer => ({ purpose, index: 0, data: 0n, executionUnits });

const txWith = (redeemers?: Cardano.Redeemer[]): Serialization.Transaction =>
  Serialization.Transaction.fromCore({
    id: TX_ID,
    body: {
      inputs: [{ txId: TX_ID, index: 0 }],
      outputs: [{ address: ADDRESS, value: { coins: 9_800_000n } }],
      fee: 200_000n,
    },
    witness: { signatures: new Map(), redeemers },
  });

const twoRedeemerTx = txWith([
  redeemer(Cardano.RedeemerPurpose.spend, { memory: 4_000_000, steps: 3e9 }),
  redeemer(Cardano.RedeemerPurpose.certificate, {
    memory: 5_000_000,
    steps: 2e9,
  }),
]);

const limitsError = (run: () => unknown): TransactionLimitsExceededError => {
  try {
    run();
  } catch (error) {
    if (error instanceof TransactionLimitsExceededError) return error;
    throw error;
  }
  throw new Error('Expected TransactionLimitsExceededError');
};

const limits = {
  maxExecutionUnitsPerTransaction: { memory: 14_000_000, steps: 10e9 },
  maxTxSize: 16_384,
};

describe('assertWithinTransactionLimits', () => {
  it('returns the summed execution units and the signed size when every limit holds', () => {
    expect(
      assertWithinTransactionLimits(twoRedeemerTx, resolvedInputs, limits),
    ).toEqual({
      executionUnits: { memory: 9_000_000, steps: 5e9 },
      signedTxSize: estimateSignedTxSize(twoRedeemerTx, resolvedInputs),
      referenceScriptSize: 0,
    });
  });

  it('reports zero execution units for a transaction without redeemers', () => {
    expect(
      assertWithinTransactionLimits(txWith(), resolvedInputs, limits)
        .executionUnits,
    ).toEqual({ memory: 0, steps: 0 });
  });

  it('accepts usage exactly at the limits', () => {
    const signedTxSize = estimateSignedTxSize(twoRedeemerTx, resolvedInputs);
    expect(() =>
      assertWithinTransactionLimits(twoRedeemerTx, resolvedInputs, {
        maxExecutionUnitsPerTransaction: { memory: 9_000_000, steps: 5e9 },
        maxTxSize: signedTxSize,
      }),
    ).not.toThrow();
  });

  it.each([
    [
      'executionMemory',
      { ...limits.maxExecutionUnitsPerTransaction, memory: 8_999_999 },
      limits.maxTxSize,
    ],
    [
      'executionSteps',
      { ...limits.maxExecutionUnitsPerTransaction, steps: 5e9 - 1 },
      limits.maxTxSize,
    ],
  ] as const)(
    'refuses summed redeemer units over the %s limit',
    (exceeded, maxExecutionUnitsPerTransaction, maxTxSize) => {
      expect(
        limitsError(() =>
          assertWithinTransactionLimits(twoRedeemerTx, resolvedInputs, {
            maxExecutionUnitsPerTransaction,
            maxTxSize,
          }),
        ).exceeded,
      ).toEqual([exceeded]);
    },
  );

  it('refuses a signed size over maxTxSize, counting the witness of every required signer', () => {
    const unsignedSize = twoRedeemerTx.toCbor().length / 2;
    const signedTxSize = estimateSignedTxSize(twoRedeemerTx, resolvedInputs);
    expect(signedTxSize).toBeGreaterThan(unsignedSize);

    const error = limitsError(() =>
      assertWithinTransactionLimits(twoRedeemerTx, resolvedInputs, {
        ...limits,
        maxTxSize: signedTxSize - 1,
      }),
    );

    expect(error.exceeded).toEqual(['txSize']);
    expect(error.usage.signedTxSize).toBe(signedTxSize);
  });

  describe('reference scripts', () => {
    const scriptOf = (byteLength: number): Cardano.Script => ({
      __type: Cardano.ScriptType.Plutus,
      version: Cardano.PlutusLanguageVersion.V3,
      bytes: HexBlob('ab'.repeat(byteLength)),
    });
    const referenceInput = (
      index: number,
      scriptReference: Cardano.Script,
    ): Cardano.Utxo => [
      {
        txId: Cardano.TransactionId('cd'.repeat(32)),
        index,
        address: OTHER_KEY_ADDRESS,
      },
      {
        address: OTHER_KEY_ADDRESS,
        value: { coins: 2_000_000n },
        scriptReference,
      },
    ];
    const referencing = (
      spentScript: Cardano.Script | undefined,
      references: Cardano.Utxo[],
    ) => {
      const [[spentIn, spentOut]] = resolvedInputs;
      const resolved: Cardano.Utxo[] = [
        [spentIn, { ...spentOut, scriptReference: spentScript }],
        ...references,
      ];
      const tx = Serialization.Transaction.fromCore({
        id: TX_ID,
        body: {
          inputs: [{ txId: TX_ID, index: 0 }],
          referenceInputs: references.map(([{ txId, index }]) => ({
            txId,
            index,
          })),
          outputs: [{ address: ADDRESS, value: { coins: 9_800_000n } }],
          fee: 200_000n,
        },
        witness: { signatures: new Map() },
      });
      return { tx, resolved };
    };

    it('counts the scripts of spent and reference inputs, and no witness for a reference input', () => {
      const { tx, resolved } = referencing(scriptOf(100), [
        referenceInput(0, scriptOf(200)),
      ]);

      const usage = assertWithinTransactionLimits(tx, resolved, limits);

      // Tagged CBOR adds 4 bytes to each script: array, language and a
      // two-byte byte-string header.
      expect(usage.referenceScriptSize).toBe(104 + 204);
      expect(usage.signedTxSize).toBe(
        estimateSignedTxSize(tx, resolved.slice(0, 1)),
      );
    });

    it('accepts 204,800 reference-script bytes and refuses one more', () => {
      // 25,595 script bytes are 25,600 bytes of tagged CBOR.
      const atLimit = Array.from({ length: 8 }, (_, index) =>
        referenceInput(index, scriptOf(25_595)),
      );
      const exactly = referencing(undefined, atLimit);
      expect(
        assertWithinTransactionLimits(exactly.tx, exactly.resolved, limits)
          .referenceScriptSize,
      ).toBe(204_800);

      const over = referencing(undefined, [
        ...atLimit.slice(0, 7),
        referenceInput(7, scriptOf(25_596)),
      ]);
      const error = limitsError(() =>
        assertWithinTransactionLimits(over.tx, over.resolved, limits),
      );
      expect(error.exceeded).toEqual(['referenceScriptSize']);
      expect(error.usage.referenceScriptSize).toBe(204_801);
    });
  });

  it('lists every exceeded limit', () => {
    expect(
      limitsError(() =>
        assertWithinTransactionLimits(twoRedeemerTx, resolvedInputs, {
          maxExecutionUnitsPerTransaction: { memory: 1, steps: 1 },
          maxTxSize: 1,
        }),
      ).exceeded,
    ).toEqual(['executionMemory', 'executionSteps', 'txSize']);
  });
});
