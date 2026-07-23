import {
  coalesceValueQuantities,
  Serialization,
  subtractValueQuantities,
} from '@cardano-sdk/core';
import { minAdaRequired } from '@cardano-sdk/tx-construction';
import { describe, expect, it } from 'vitest';

import {
  InputSelectionError,
  InputSelectionFailure,
} from '../../src/input-selection/InputSelectionError';
import { LargeFirstCoinSelector } from '../../src/input-selection/LargeFirstCoinSelector';

import type { CoinSelectorProtocolParameters } from '../../src/input-selection/types';
import type { Cardano } from '@cardano-sdk/core';

const address =
  'addr1x8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shskhj42g';
const changeAddress =
  'addr_test1qqnqfr70emn3kyywffxja44znvdw0y4aeyh0vdc3s3rky48vlp50u6nrq5s7k6h89uqrjnmr538y6e50crvz6jdv3vqqxah5fk' as Cardano.PaymentAddress;

const relaxedProtocolParameters: CoinSelectorProtocolParameters = {
  coinsPerUtxoByte: 0,
  maxValueSize: 0,
};
const realisticProtocolParameters: CoinSelectorProtocolParameters = {
  coinsPerUtxoByte: 4310,
  maxValueSize: 5000,
};

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

const utxoIds = (utxos: Cardano.Utxo[]): Set<string> =>
  new Set(utxos.map(([index]) => `${index.txId}:${index.index}`));

const expectExactBalance = (
  selection: Cardano.Utxo[],
  target: Cardano.Value,
  changeOutputs: Cardano.TxOut[],
): void => {
  const selected = coalesceValueQuantities(
    selection.map(([, out]) => out.value),
  );
  const returned = coalesceValueQuantities([
    target,
    ...changeOutputs.map(output => output.value),
  ]);
  expect(selected.coins).toBe(returned.coins);
  const assetDiff = subtractValueQuantities([selected, returned]);
  expect([...(assetDiff.assets ?? [])]).toEqual([]);
};

const expectFailure = (
  act: () => void,
  failure: InputSelectionFailure,
): void => {
  let caught: unknown;
  try {
    act();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(InputSelectionError);
  expect((caught as InputSelectionError).failure).toBe(failure);
};

describe('LargeFirstCoinSelector', () => {
  const selector = new LargeFirstCoinSelector();
  const policyId = '0b0d621b5c26d0a1fd0893a4b04c19d860296a69ede1fbcfc5179882';
  const assetId = (name: string): Cardano.AssetId =>
    `${policyId}${Buffer.from(name).toString('hex')}` as Cardano.AssetId;
  const ASSET_A = assetId('assetA');

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
      changeAddress,
      protocolParameters: relaxedProtocolParameters,
    });

    expect(utxoIds(selection)).toEqual(new Set(['t:1', 't:0', 't:2']));
    expect(utxoIds(remaining)).toEqual(new Set(['t:3', 't:4']));

    const finalValue = coalesceValueQuantities(
      selection.map(([, o]) => o.value),
    );
    expect(finalValue.assets?.get(ASSET_A)).toBe(140n);
    expect(finalValue.coins).toBe(35_000n);
  });

  it('throws BalanceInsufficient if required asset cannot be met', () => {
    const available = [
      utxo(txIn('t', 0), 5_000n, new Map([asset(ASSET_A, 10n)])),
      utxo(txIn('t', 1), 5_000n, new Map([asset(ASSET_A, 20n)])),
    ];
    const target = targetValue(1_000n, new Map([asset(ASSET_A, 100n)]));

    const act = () =>
      selector.select({
        preSelectedUtxo: [],
        availableUtxo: available,
        targetValue: target,
        changeAddress,
        protocolParameters: relaxedProtocolParameters,
      });

    expect(act).toThrow(`Insufficient balance for asset ${ASSET_A}`);
    expectFailure(act, InputSelectionFailure.BalanceInsufficient);
  });

  it('throws BalanceInsufficient if ADA cannot be met after asset selection', () => {
    const available = [
      utxo(txIn('t', 0), 2_000n, new Map([asset(ASSET_A, 100n)])),
      utxo(txIn('t', 1), 1_000n),
    ];
    const target = targetValue(10_000n, new Map([asset(ASSET_A, 50n)]));

    const act = () =>
      selector.select({
        preSelectedUtxo: [],
        availableUtxo: available,
        targetValue: target,
        changeAddress,
        protocolParameters: relaxedProtocolParameters,
      });

    expect(act).toThrow('Insufficient ADA');
    expectFailure(act, InputSelectionFailure.BalanceInsufficient);
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
      changeAddress,
      protocolParameters: relaxedProtocolParameters,
    });

    expect(utxoIds(selection)).toEqual(new Set(['p:0', 't:0', 't:1']));
    expect(utxoIds(remaining)).toEqual(new Set([]));
  });

  it('asset comparator ties on asset qty break on ADA (desc)', () => {
    const a = utxo(txIn('t', 0), 1_000n, new Map([asset(ASSET_A, 50n)]));
    const b = utxo(txIn('t', 1), 9_000n, new Map([asset(ASSET_A, 50n)]));

    const target = targetValue(1n, new Map([asset(ASSET_A, 50n)]));

    const { selection } = selector.select({
      preSelectedUtxo: [],
      availableUtxo: [a, b],
      targetValue: target,
      changeAddress,
      protocolParameters: relaxedProtocolParameters,
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
      changeAddress,
      protocolParameters: relaxedProtocolParameters,
    });

    // largest-first: t1(10k) + t2(5k) meets 12k
    expect(utxoIds(selection)).toEqual(new Set(['t:1', 't:2']));

    const finalValue = coalesceValueQuantities(
      selection.map(([, o]) => o.value),
    );
    expect(finalValue.coins).toBe(15_000n);

    expect(utxoIds(remaining)).toEqual(new Set(['t:0']));
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
      changeAddress,
      protocolParameters: relaxedProtocolParameters,
    });

    expect(utxoIds(selection)).toEqual(new Set(['t:0', 't:2']));
    expect(utxoIds(remaining)).toEqual(new Set(['t:1']));
  });

  it('exact ADA satisfied, no additional ADA UTXOs picked', () => {
    const available = [utxo(txIn('t', 0), 10_000n), utxo(txIn('t', 1), 5_000n)];
    const target = targetValue(10_001n);

    const { selection } = selector.select({
      preSelectedUtxo: [],
      availableUtxo: available,
      targetValue: target,
      changeAddress,
      protocolParameters: relaxedProtocolParameters,
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
      changeAddress,
      protocolParameters: relaxedProtocolParameters,
    });
    const value2 = coalesceValueQuantities(s2.map(([, o]) => o.value));

    expect((value2.coins ?? 0n) >= 10_000n).toBe(true);
  });

  describe('change outputs', () => {
    it('returns empty changeOutputs when the selection matches the target exactly', () => {
      const available = [utxo(txIn('t', 0), 5_000_000n)];
      const target = targetValue(5_000_000n);

      const { selection, remaining, changeOutputs } = selector.select({
        preSelectedUtxo: [],
        availableUtxo: available,
        targetValue: target,
        changeAddress,
        protocolParameters: realisticProtocolParameters,
      });

      expect(utxoIds(selection)).toEqual(new Set(['t:0']));
      expect(remaining).toEqual([]);
      expect(changeOutputs).toEqual([]);
    });

    it('returns the surplus as a single min-ADA compliant change output at the change address', () => {
      const available = [
        utxo(txIn('t', 0), 5_000_000n, new Map([asset(ASSET_A, 10n)])),
      ];
      const target = targetValue(2_000_000n, new Map([asset(ASSET_A, 4n)]));

      const { selection, changeOutputs } = selector.select({
        preSelectedUtxo: [],
        availableUtxo: available,
        targetValue: target,
        changeAddress,
        protocolParameters: realisticProtocolParameters,
      });

      expect(changeOutputs).toHaveLength(1);
      const [change] = changeOutputs;
      expect(change.address).toBe(changeAddress);
      expect(change.value.coins).toBe(3_000_000n);
      expect(change.value.assets?.get(ASSET_A)).toBe(6n);
      expect(
        change.value.coins >=
          minAdaRequired(
            change,
            BigInt(realisticProtocolParameters.coinsPerUtxoByte),
          ),
      ).toBe(true);
      expectExactBalance(selection, target, changeOutputs);
    });

    it('pulls additional largest-ADA UTxOs from remaining into selection when the surplus is below min-ADA', () => {
      const available = [
        utxo(txIn('t', 0), 10_000_000n),
        utxo(txIn('t', 1), 9_500_000n),
        utxo(txIn('t', 2), 2_000_000n),
        utxo(txIn('t', 3), 1_000_000n),
      ];
      const target = targetValue(19_400_000n);

      const { selection, remaining, changeOutputs } = selector.select({
        preSelectedUtxo: [],
        availableUtxo: available,
        targetValue: target,
        changeAddress,
        protocolParameters: realisticProtocolParameters,
      });

      expect(utxoIds(selection)).toEqual(new Set(['t:0', 't:1', 't:2']));
      expect(utxoIds(remaining)).toEqual(new Set(['t:3']));

      expect(changeOutputs).toHaveLength(1);
      expect(changeOutputs[0].value.coins).toBe(2_100_000n);
      expect(
        changeOutputs[0].value.coins >=
          minAdaRequired(
            changeOutputs[0],
            BigInt(realisticProtocolParameters.coinsPerUtxoByte),
          ),
      ).toBe(true);
      expectExactBalance(selection, target, changeOutputs);
    });

    it('throws UtxoFullyDepleted when remaining cannot fund the change min-ADA', () => {
      const available = [utxo(txIn('t', 0), 1_000_000n)];
      const target = targetValue(500_000n);

      expectFailure(
        () =>
          selector.select({
            preSelectedUtxo: [],
            availableUtxo: available,
            targetValue: target,
            changeAddress,
            protocolParameters: realisticProtocolParameters,
          }),
        InputSelectionFailure.UtxoFullyDepleted,
      );
    });

    it('throws UtxoFullyDepleted when remaining holds no more lovelace', () => {
      const available = [
        utxo(txIn('t', 0), 1_000_000n),
        utxo(txIn('t', 1), 0n, new Map([asset(ASSET_A, 5n)])),
      ];
      const target = targetValue(500_000n);

      expectFailure(
        () =>
          selector.select({
            preSelectedUtxo: [],
            availableUtxo: available,
            targetValue: target,
            changeAddress,
            protocolParameters: realisticProtocolParameters,
          }),
        InputSelectionFailure.UtxoFullyDepleted,
      );
    });

    it('splits an oversized change asset bundle into multiple min-ADA compliant outputs summing exactly', () => {
      const maxValueSize = 60;
      const assets = new Map([
        asset(assetId('asset0'), 5n),
        asset(assetId('asset1'), 5n),
        asset(assetId('asset2'), 5n),
        asset(assetId('asset3'), 5n),
      ]);
      const available = [utxo(txIn('t', 0), 10_000_000n, assets)];
      const target = targetValue(
        1_000_000n,
        new Map([...assets.keys()].map(id => asset(id, 1n))),
      );

      const { selection, changeOutputs } = selector.select({
        preSelectedUtxo: [],
        availableUtxo: available,
        targetValue: target,
        changeAddress,
        protocolParameters: { coinsPerUtxoByte: 4310, maxValueSize },
      });

      expect(changeOutputs.length).toBeGreaterThan(1);
      for (const change of changeOutputs) {
        expect(change.address).toBe(changeAddress);
        const serializedSize =
          Serialization.Value.fromCore(change.value).toCbor().length / 2;
        expect(serializedSize).toBeLessThanOrEqual(maxValueSize);
        expect(change.value.coins >= minAdaRequired(change, 4310n)).toBe(true);
      }
      expectExactBalance(selection, target, changeOutputs);
    });
  });
});
