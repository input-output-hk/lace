import { coalesceValueQuantities } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { LargeFirstCoinSelector } from '../../src/input-selection/LargeFirstCoinSelector';

import type { Cardano } from '@cardano-sdk/core';

const address =
  'addr1x8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shskhj42g';
const txIn = (txId: string, index: number): Cardano.TxIn => ({
  txId: txId as Cardano.TransactionId,
  index,
});
const utxo = (
  index: Cardano.TxIn,
  coins: bigint = 0n,
  assets?: Cardano.TokenMap,
): Cardano.Utxo => [
  { ...index, address: address as Cardano.PaymentAddress },
  { address: address as Cardano.PaymentAddress, value: { coins, assets } },
];

const asset = (id: Cardano.AssetId, qty: bigint) =>
  [id, qty] as [Cardano.AssetId, bigint];

const targetValue = (
  coins: Cardano.Lovelace,
  assets?: Cardano.TokenMap,
): Cardano.Value => {
  return { coins, assets };
};

describe('LargeFirstCoinSelector', () => {
  const selector = new LargeFirstCoinSelector();
  const ASSET_A: Cardano.AssetId = 'policyA.assetA' as Cardano.AssetId;

  it('selects UTXOs to satisfy required asset first, then tops up ADA (largest-first)', () => {
    const available = [
      utxo(txIn('t', 0), 5_000n, new Map([asset(ASSET_A, 60n)])),
      utxo(txIn('t', 1), 10_000n, new Map([asset(ASSET_A, 80n)])),
      utxo(txIn('t', 2), 20_000n),
      utxo(txIn('t', 3), 7_000n, new Map([asset(ASSET_A, 10n)])),
      utxo(txIn('t', 4), 15_000n),
    ] as Cardano.Utxo[];

    const target = targetValue(25_000n, new Map([asset(ASSET_A, 100n)]));

    const { selection, remaining } = selector.select({
      preSelectedUtxo: [],
      availableUtxo: available,
      targetValue: target,
    });

    const pickedIds = selection.map(
      ([index]) => `${index.txId}:${index.index}`,
    );
    expect(new Set(pickedIds)).toEqual(new Set(['t:1', 't:0', 't:2']));

    const remainingIds = remaining.map(
      ([index]) => `${index.txId}:${index.index}`,
    );
    expect(new Set(remainingIds)).toEqual(new Set(['t:3', 't:4']));

    const finalValue = coalesceValueQuantities(
      selection.map(([, o]) => o.value),
    );
    expect(finalValue.assets?.get(ASSET_A)).toBe(140n);
    expect(finalValue.coins).toBe(35_000n);
  });

  it('throws if required asset cannot be met', () => {
    const available = [
      utxo(txIn('t', 0), 5_000n, new Map([asset(ASSET_A, 10n)])),
      utxo(txIn('t', 1), 5_000n, new Map([asset(ASSET_A, 20n)])),
    ];
    const target = targetValue(1_000n, new Map([asset(ASSET_A, 100n)]));

    expect(() =>
      selector.select({
        preSelectedUtxo: [],
        availableUtxo: available,
        targetValue: target,
      }),
    ).toThrow(`Insufficient balance for asset ${ASSET_A}`);
  });

  it('throws "Insufficient ADA" if ADA cannot be met after asset selection', () => {
    const available = [
      utxo(txIn('t', 0), 2_000n, new Map([asset(ASSET_A, 100n)])),
      utxo(txIn('t', 1), 1_000n),
    ];
    const target = targetValue(10_000n, new Map([asset(ASSET_A, 50n)]));

    expect(() =>
      selector.select({
        preSelectedUtxo: [],
        availableUtxo: available,
        targetValue: target,
      }),
    ).toThrow('Insufficient ADA');
  });

  it('preSelectedUtxo are counted and excluded from remaining; not duplicated', () => {
    const pre = utxo(txIn('p', 0), 3_000n, new Map([asset(ASSET_A, 40n)]));
    const available = [
      pre,
      utxo(txIn('t', 0), 4_000n, new Map([asset(ASSET_A, 30n)])),
      utxo(txIn('t', 1), 8_000n),
    ];

    const target = targetValue(10_000n, new Map([asset(ASSET_A, 50n)]));

    const { selection, remaining } = selector.select({
      preSelectedUtxo: [pre],
      availableUtxo: available,
      targetValue: target,
    });

    const idsSel = selection.map(([index]) => `${index.txId}:${index.index}`);
    const idsRem = remaining.map(([index]) => `${index.txId}:${index.index}`);

    expect(new Set(idsSel)).toEqual(new Set(['p:0', 't:0', 't:1']));
    expect(new Set(idsRem)).toEqual(new Set([]));
  });

  it('asset comparator ties on asset qty break on ADA (desc)', () => {
    const a = utxo(txIn('t', 0), 1_000n, new Map([asset(ASSET_A, 50n)]));
    const b = utxo(txIn('t', 1), 9_000n, new Map([asset(ASSET_A, 50n)]));

    const target = targetValue(1n, new Map([asset(ASSET_A, 50n)]));

    const { selection } = selector.select({
      preSelectedUtxo: [],
      availableUtxo: [a, b],
      targetValue: target,
    });

    expect(selection[0][0]).toEqual(b[0]);
  });

  it('no assets in target, only ADA selection (largest-first)', () => {
    const available = [
      utxo(txIn('t', 0), 3_000n),
      utxo(txIn('t', 1), 10_000n),
      utxo(txIn('t', 2), 5_000n),
    ];

    const target = targetValue(12_000n);

    const { selection, remaining } = selector.select({
      preSelectedUtxo: [],
      availableUtxo: available,
      targetValue: target,
    });

    const selectedIds = selection.map(
      ([index]) => `${index.txId}:${index.index}`,
    );
    // largest-first: t1(10k) + t2(5k) meets 12k
    expect(new Set(selectedIds)).toEqual(new Set(['t:1', 't:2']));

    const finalValue = coalesceValueQuantities(
      selection.map(([, o]) => o.value),
    );
    expect(finalValue.coins).toBe(15_000n);

    const remainingIds = remaining.map(
      ([index]) => `${index.txId}:${index.index}`,
    );
    expect(new Set(remainingIds)).toEqual(new Set(['t:0']));
  });

  it('asset phase ignores UTXOs with zero of the target asset (stops after positives due to sorting)', () => {
    const available = [
      utxo(txIn('t', 0), 9_000n, new Map([asset(ASSET_A, 30n)])),
      utxo(txIn('t', 1), 8_000n),
      utxo(txIn('t', 2), 7_000n, new Map([asset(ASSET_A, 20n)])),
    ];

    const target = targetValue(5_000n, new Map([asset(ASSET_A, 40n)]));

    const { selection, remaining } = selector.select({
      preSelectedUtxo: [],
      availableUtxo: available,
      targetValue: target,
    });

    const selIds = selection.map(([index]) => `${index.txId}:${index.index}`);
    expect(new Set(selIds)).toEqual(new Set(['t:0', 't:2']));

    const remIds = remaining.map(([index]) => `${index.txId}:${index.index}`);
    expect(new Set(remIds)).toEqual(new Set(['t:1']));
  });

  it('exact ADA satisfied, no additional ADA UTXOs picked', () => {
    const available = [utxo(txIn('t', 0), 10_000n), utxo(txIn('t', 1), 5_000n)];
    const target = targetValue(10_001n);

    const { selection } = selector.select({
      preSelectedUtxo: [],
      availableUtxo: available,
      targetValue: target,
    });

    const idsSel = selection.map(([index]) => `${index.txId}:${index.index}`);
    expect(idsSel).toEqual(['t:0', 't:1']);

    const finalValue = coalesceValueQuantities(
      selection.map(([, o]) => o.value),
    );
    expect(finalValue.coins).toBe(15_000n);

    const target2 = targetValue(10_000n);
    const { selection: s2 } = selector.select({
      preSelectedUtxo: [],
      availableUtxo: [utxo(txIn('x', 0), 10_000n), utxo(txIn('x', 1), 5_000n)],
      targetValue: target2,
    });
    const value2 = coalesceValueQuantities(s2.map(([, o]) => o.value));

    expect((value2.coins ?? 0n) >= 10_000n).toBe(true);
  });
});
