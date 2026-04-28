import { describe, expect, it, vi } from 'vitest';

import { computeCollateralValue } from '../src/common/utils';

import type { Cardano } from '@cardano-sdk/core';

describe('computeCollateralValue', () => {
  const createMockInputResolver = (
    resolveMap: Map<string, Cardano.TxOut | null>,
  ): Cardano.InputResolver => ({
    resolveInput: async (txIn: Cardano.TxIn): Promise<Cardano.TxOut | null> => {
      const key = `${txIn.txId}#${txIn.index}`;
      return resolveMap.get(key) ?? null;
    },
  });

  const createTxOut = (coins: bigint): Cardano.TxOut => ({
    address:
      'addr_test1qzxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' as Cardano.PaymentAddress,
    value: { coins },
  });

  it('should return 0 for empty collateral inputs', async () => {
    const resolver = createMockInputResolver(new Map());
    const result = await computeCollateralValue([], resolver);
    expect(result).toBe(BigInt(0));
  });

  it('should compute value for a single collateral input', async () => {
    const txId =
      'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234';
    const collateralInputs = [{ txId, index: 0 }];

    const resolveMap = new Map([[`${txId}#0`, createTxOut(BigInt(5_000_000))]]);
    const resolver = createMockInputResolver(resolveMap);

    const result = await computeCollateralValue(collateralInputs, resolver);
    expect(result).toBe(BigInt(5_000_000));
  });

  it('should sum values from multiple collateral inputs', async () => {
    const txId1 =
      'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234';
    const txId2 =
      'efgh5678901234efgh5678901234efgh5678901234efgh5678901234efgh5678';
    const collateralInputs = [
      { txId: txId1, index: 0 },
      { txId: txId1, index: 1 },
      { txId: txId2, index: 0 },
    ];

    const resolveMap = new Map<string, Cardano.TxOut>([
      [`${txId1}#0`, createTxOut(BigInt(2_000_000))],
      [`${txId1}#1`, createTxOut(BigInt(3_000_000))],
      [`${txId2}#0`, createTxOut(BigInt(5_000_000))],
    ]);
    const resolver = createMockInputResolver(resolveMap);

    const result = await computeCollateralValue(collateralInputs, resolver);
    expect(result).toBe(BigInt(10_000_000));
  });

  it('should skip unresolvable inputs and return partial sum', async () => {
    const txId =
      'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234';
    const unknownTxId =
      '00001234567890000012345678900000123456789000001234567890000012ab';
    const collateralInputs = [
      { txId, index: 0 },
      { txId: unknownTxId, index: 0 },
    ];

    const resolveMap = new Map([[`${txId}#0`, createTxOut(BigInt(5_000_000))]]);
    const resolver = createMockInputResolver(resolveMap);

    const result = await computeCollateralValue(collateralInputs, resolver);
    expect(result).toBe(BigInt(5_000_000));
  });

  it('should return 0 when all inputs fail to resolve', async () => {
    const unknownTxId =
      '00001234567890000012345678900000123456789000001234567890000012ab';
    const collateralInputs = [
      { txId: unknownTxId, index: 0 },
      { txId: unknownTxId, index: 1 },
    ];

    const resolver = createMockInputResolver(new Map());
    const result = await computeCollateralValue(collateralInputs, resolver);
    expect(result).toBe(BigInt(0));
  });

  it('should handle resolver that throws errors', async () => {
    const txId =
      'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234';
    const collateralInputs = [{ txId, index: 0 }];

    const resolver: Cardano.InputResolver = {
      resolveInput: vi.fn().mockRejectedValue(new Error('Network error')),
    };

    const result = await computeCollateralValue(collateralInputs, resolver);
    expect(result).toBe(BigInt(0));
  });

  it('should handle mixed success and error in resolver', async () => {
    const txId1 =
      'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234';
    const txId2 =
      'efgh5678901234efgh5678901234efgh5678901234efgh5678901234efgh5678';
    const collateralInputs = [
      { txId: txId1, index: 0 },
      { txId: txId2, index: 0 },
    ];

    const resolver: Cardano.InputResolver = {
      resolveInput: vi.fn().mockImplementation(async (txIn: Cardano.TxIn) => {
        if (txIn.txId === txId1) {
          return createTxOut(BigInt(5_000_000));
        }
        throw new Error('Resolution failed');
      }),
    };

    const result = await computeCollateralValue(collateralInputs, resolver);
    expect(result).toBe(BigInt(5_000_000));
  });
});
