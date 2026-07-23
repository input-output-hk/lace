import { Serialization } from '@cardano-sdk/core';
import { minAdaRequired } from '@cardano-sdk/tx-construction';
import { describe, expect, it } from 'vitest';

import {
  InputSelectionError,
  InputSelectionFailure,
} from '../../src/input-selection/InputSelectionError';
import { RoundRobinRandomCoinSelector } from '../../src/input-selection/RoundRobinRandomCoinSelector';

import type {
  CoinSelectorProtocolParameters,
  CoinSelectorResult,
} from '../../src/input-selection/types';
import type { Cardano } from '@cardano-sdk/core';

const address =
  'addr1x8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gt7r0vd4msrxnuwnccdxlhdjar77j6lg0wypcc9uar5d2shskhj42g' as Cardano.PaymentAddress;
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
  { ...index, address },
  { address, value: { coins, assets } },
];

const asset = (id: Cardano.AssetId, qty: bigint) =>
  [id, qty] as [Cardano.AssetId, bigint];

const targetValue = (
  coins: Cardano.Lovelace,
  assets?: Cardano.TokenMap,
): Cardano.Value => ({ coins, assets });

const output = (coins: bigint, assets?: Cardano.TokenMap): Cardano.TxOut => ({
  address,
  value: { coins, assets },
});

const utxoIds = (utxos: Cardano.Utxo[]): Set<string> =>
  new Set(utxos.map(([index]) => `${index.txId}:${index.index}`));

const totalOf = (
  values: Cardano.Value[],
): { coins: bigint; assets: Map<Cardano.AssetId, bigint> } => {
  let coins = 0n;
  const assets = new Map<Cardano.AssetId, bigint>();
  for (const value of values) {
    coins += value.coins;
    for (const [id, quantity] of value.assets ?? []) {
      assets.set(id, (assets.get(id) ?? 0n) + quantity);
    }
  }
  return { coins, assets };
};

const expectExactBalance = (
  selection: Cardano.Utxo[],
  target: Cardano.Value,
  changeOutputs: Cardano.TxOut[],
): void => {
  const selected = totalOf(selection.map(([, out]) => out.value));
  const returned = totalOf([
    target,
    ...changeOutputs.map(change => change.value),
  ]);
  expect(selected.coins).toBe(returned.coins);
  const assetIds = new Set([
    ...selected.assets.keys(),
    ...returned.assets.keys(),
  ]);
  for (const id of assetIds) {
    expect(selected.assets.get(id) ?? 0n).toBe(returned.assets.get(id) ?? 0n);
  }
};

const expectUtxoConservation = (
  available: Cardano.Utxo[],
  { selection, remaining }: Pick<CoinSelectorResult, 'remaining' | 'selection'>,
): void => {
  const selectedIds = utxoIds(selection);
  const remainingIds = utxoIds(remaining);
  expect(selection.length + remaining.length).toBe(available.length);
  for (const id of utxoIds(available)) {
    expect(selectedIds.has(id) !== remainingIds.has(id)).toBe(true);
  }
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

describe('RoundRobinRandomCoinSelector', () => {
  const policyId = '0b0d621b5c26d0a1fd0893a4b04c19d860296a69ede1fbcfc5179882';
  const assetId = (name: string): Cardano.AssetId =>
    `${policyId}${Buffer.from(name).toString('hex')}` as Cardano.AssetId;
  const ASSET_A = assetId('assetA');

  it('is deterministic for a fixed seed', () => {
    const runSelection = () => {
      const selector = new RoundRobinRandomCoinSelector({ seed: 7n });
      return selector.select({
        availableUtxo: Array.from({ length: 20 }, (_, index) =>
          utxo(txIn('t', index), 1_000_000n * BigInt(index + 1)),
        ),
        targetValue: targetValue(15_000_000n),
        changeAddress,
        protocolParameters: realisticProtocolParameters,
      });
    };

    const first = runSelection();
    const second = runSelection();

    expect(first.selection.map(([index]) => index)).toEqual(
      second.selection.map(([index]) => index),
    );
    expect(first.changeOutputs).toEqual(second.changeOutputs);
    expectExactBalance(
      first.selection,
      targetValue(15_000_000n),
      first.changeOutputs,
    );
  });

  it('repeated calls on the same selector are reproducible', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 7n });
    const availableUtxo = Array.from({ length: 20 }, (_, index) =>
      utxo(txIn('t', index), 1_000_000n * BigInt(index + 1)),
    );
    const params = {
      availableUtxo,
      targetValue: targetValue(15_000_000n),
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    };

    const first = selector.select(params);
    const second = selector.select(params);

    expect(first.selection.map(([index]) => index)).toEqual(
      second.selection.map(([index]) => index),
    );
    expect(first.remaining.map(([index]) => index)).toEqual(
      second.remaining.map(([index]) => index),
    );
    expect(first.changeOutputs).toEqual(second.changeOutputs);
    expectUtxoConservation(availableUtxo, first);
  });

  it('uses an entropy seed by default and satisfies the balance invariant', () => {
    const selector = new RoundRobinRandomCoinSelector();
    const availableUtxo = Array.from({ length: 10 }, (_, index) =>
      utxo(txIn('t', index), 5_000_000n),
    );
    const target = targetValue(12_000_000n);

    const { selection, remaining, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    });

    expectExactBalance(selection, target, changeOutputs);
    expectUtxoConservation(availableUtxo, { selection, remaining });
  });

  it('mimics the number of user outputs', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const availableUtxo = Array.from({ length: 8 }, (_, index) =>
      utxo(txIn('t', index), 10_000_000n),
    );
    const target = targetValue(10_000_000n);

    const { selection, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      outputsToCover: [output(5_000_000n), output(5_000_000n)],
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    });

    expect(changeOutputs).toHaveLength(2);
    for (const change of changeOutputs) {
      expect(change.address).toBe(changeAddress);
      expect(
        change.value.coins >=
          minAdaRequired(
            change,
            BigInt(realisticProtocolParameters.coinsPerUtxoByte),
          ),
      ).toBe(true);
    }
    expectExactBalance(selection, target, changeOutputs);
  });

  it('minimal strategy selects no more inputs than optimal', () => {
    const availableUtxo = Array.from({ length: 20 }, (_, index) =>
      utxo(txIn('t', index), 5_000_000n),
    );
    const params = {
      availableUtxo,
      targetValue: targetValue(18_000_000n),
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    };

    const minimal = new RoundRobinRandomCoinSelector({
      seed: 7n,
      strategy: 'minimal',
    }).select(params);
    const optimal = new RoundRobinRandomCoinSelector({
      seed: 7n,
      strategy: 'optimal',
    }).select(params);

    expect(minimal.selection).toHaveLength(4);
    expect(optimal.selection.length).toBeGreaterThan(minimal.selection.length);
    expectExactBalance(
      minimal.selection,
      params.targetValue,
      minimal.changeOutputs,
    );
    expectExactBalance(
      optimal.selection,
      params.targetValue,
      optimal.changeOutputs,
    );
  });

  it('throws BalanceInsufficient when ADA cannot be covered', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const act = () =>
      selector.select({
        availableUtxo: [utxo(txIn('t', 0), 1_000_000n)],
        targetValue: targetValue(5_000_000n),
        changeAddress,
        protocolParameters: realisticProtocolParameters,
      });

    expect(act).toThrow('Insufficient ADA: short by 4000000 lovelace');
    expectFailure(act, InputSelectionFailure.BalanceInsufficient);
  });

  it('throws BalanceInsufficient when a required asset cannot be covered', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const act = () =>
      selector.select({
        availableUtxo: [
          utxo(txIn('t', 0), 5_000_000n, new Map([asset(ASSET_A, 10n)])),
          utxo(txIn('t', 1), 5_000_000n, new Map([asset(ASSET_A, 20n)])),
        ],
        targetValue: targetValue(1_000_000n, new Map([asset(ASSET_A, 100n)])),
        changeAddress,
        protocolParameters: realisticProtocolParameters,
      });

    expect(act).toThrow(`Insufficient balance for asset ${ASSET_A}`);
    expectFailure(act, InputSelectionFailure.BalanceInsufficient);
  });

  it('splits an oversized change asset bundle into multiple min-ADA compliant outputs summing exactly', () => {
    const maxValueSize = 60;
    const assets = new Map([
      asset(assetId('asset0'), 5n),
      asset(assetId('asset1'), 5n),
      asset(assetId('asset2'), 5n),
      asset(assetId('asset3'), 5n),
    ]);
    const availableUtxo = [utxo(txIn('t', 0), 10_000_000n, assets)];
    const target = targetValue(
      1_000_000n,
      new Map([...assets.keys()].map(id => asset(id, 1n))),
    );

    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const { selection, changeOutputs } = selector.select({
      availableUtxo,
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

  it('distributes user-specified asset excess proportionally to the output quantities', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const availableUtxo = [
      utxo(txIn('t', 0), 10_000_000n, new Map([asset(ASSET_A, 12n)])),
    ];
    const target = targetValue(2_000_000n, new Map([asset(ASSET_A, 3n)]));

    const { selection, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      outputsToCover: [
        output(1_000_000n, new Map([asset(ASSET_A, 1n)])),
        output(1_000_000n, new Map([asset(ASSET_A, 2n)])),
      ],
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    });

    expect(changeOutputs).toHaveLength(2);
    expect(changeOutputs[0].value.assets?.get(ASSET_A)).toBe(3n);
    expect(changeOutputs[1].value.assets?.get(ASSET_A)).toBe(6n);
    expectExactBalance(selection, target, changeOutputs);
  });

  it('preserves the input granularity of non-user-specified assets across change outputs', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const availableUtxo = [
      utxo(txIn('t', 0), 10_000_000n, new Map([asset(ASSET_A, 5n)])),
      utxo(txIn('t', 1), 10_000_000n, new Map([asset(ASSET_A, 3n)])),
    ];
    const target = targetValue(8_000_000n);

    const { selection, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      outputsToCover: [output(4_000_000n), output(4_000_000n)],
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    });

    expect(changeOutputs).toHaveLength(2);
    expect(changeOutputs[0].value.assets?.get(ASSET_A)).toBe(3n);
    expect(changeOutputs[1].value.assets?.get(ASSET_A)).toBe(5n);
    expectExactBalance(selection, target, changeOutputs);
  });

  it('reduces non-user-specified asset change from the smallest quantities when the target burns some', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const availableUtxo = [
      utxo(txIn('t', 0), 10_000_000n, new Map([asset(ASSET_A, 10n)])),
    ];
    const target = targetValue(1_000_000n, new Map([asset(ASSET_A, 4n)]));

    const { selection, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      outputsToCover: [output(1_000_000n)],
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    });

    expect(changeOutputs).toHaveLength(1);
    expect(changeOutputs[0].value.assets?.get(ASSET_A)).toBe(6n);
    expectExactBalance(selection, target, changeOutputs);
  });

  it('treats a negative target asset quantity as an implicit input flowing into change', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const availableUtxo = [utxo(txIn('t', 0), 10_000_000n)];
    const target = targetValue(2_000_000n, new Map([asset(ASSET_A, -5n)]));

    const { selection, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    });

    expect(changeOutputs).toHaveLength(1);
    expect(changeOutputs[0].value.assets?.get(ASSET_A)).toBe(5n);
    expectExactBalance(selection, target, changeOutputs);
  });

  it('returns empty changeOutputs when the selection matches the target exactly and the pool is exhausted', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const availableUtxo = [utxo(txIn('t', 0), 5_000_000n)];
    const target = targetValue(5_000_000n);

    const { selection, remaining, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    });

    expect(utxoIds(selection)).toEqual(new Set(['t:0']));
    expect(remaining).toEqual([]);
    expect(changeOutputs).toEqual([]);
  });

  it('pulls an additional input to produce change when the selection is an exact match and the pool is not exhausted', () => {
    const selector = new RoundRobinRandomCoinSelector({
      seed: 42n,
      strategy: 'minimal',
    });
    const availableUtxo = [
      utxo(txIn('t', 0), 5_000_000n),
      utxo(txIn('t', 1), 5_000_000n),
    ];
    const target = targetValue(5_000_000n);

    const { selection, remaining, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    });

    expect(selection).toHaveLength(2);
    expect(remaining).toEqual([]);
    expect(changeOutputs).toHaveLength(1);
    expect(changeOutputs[0].value.coins).toBe(5_000_000n);
    expectExactBalance(selection, target, changeOutputs);
  });

  it('forces one input when the target is empty', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const availableUtxo = [
      utxo(txIn('t', 0), 10_000_000n),
      utxo(txIn('t', 1), 10_000_000n),
    ];
    const target = targetValue(0n);

    const { selection, remaining, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      outputsToCover: [],
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    });

    expect(selection).toHaveLength(1);
    expect(remaining).toHaveLength(1);
    expect(changeOutputs).toHaveLength(1);
    expect(changeOutputs[0].value.coins).toBe(10_000_000n);
    expectExactBalance(selection, target, changeOutputs);
  });

  it('throws BalanceInsufficient when the forced input pick finds no lovelace', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const act = () =>
      selector.select({
        availableUtxo: [utxo(txIn('t', 0), 0n, new Map([asset(ASSET_A, 1n)]))],
        targetValue: targetValue(0n),
        changeAddress,
        protocolParameters: relaxedProtocolParameters,
      });

    expectFailure(act, InputSelectionFailure.BalanceInsufficient);
  });

  it('always includes preSelectedUtxo, counts them toward targets and never duplicates them', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const pre = utxo(txIn('p', 0), 3_000n, new Map([asset(ASSET_A, 40n)]));
    const availableUtxo = [
      pre,
      utxo(txIn('t', 0), 4_000n, new Map([asset(ASSET_A, 30n)])),
      utxo(txIn('t', 1), 8_000n),
    ];
    const target = targetValue(10_000n, new Map([asset(ASSET_A, 50n)]));

    const { selection, remaining, changeOutputs } = selector.select({
      preSelectedUtxo: [pre],
      availableUtxo,
      targetValue: target,
      changeAddress,
      protocolParameters: relaxedProtocolParameters,
    });

    expect(utxoIds(selection)).toEqual(new Set(['p:0', 't:0', 't:1']));
    expect(selection).toHaveLength(3);
    expect(remaining).toEqual([]);
    expectExactBalance(selection, target, changeOutputs);
  });

  it('consumes singleton (ada-only) UTxOs before multi-asset ones', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const availableUtxo = [
      utxo(txIn('m', 0), 100_000_000n, new Map([asset(ASSET_A, 1n)])),
      utxo(txIn('s', 0), 4_000_000n),
      utxo(txIn('s', 1), 4_000_000n),
      utxo(txIn('s', 2), 4_000_000n),
    ];
    const target = targetValue(10_000_000n);

    const { selection, remaining, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    });

    expect(utxoIds(selection)).toEqual(new Set(['s:0', 's:1', 's:2']));
    expect(utxoIds(remaining)).toEqual(new Set(['m:0']));
    expectExactBalance(selection, target, changeOutputs);
  });

  it('pulls an additional ada UTxO when the change cannot meet min-ADA', () => {
    const selector = new RoundRobinRandomCoinSelector({
      seed: 42n,
      strategy: 'minimal',
    });
    const availableUtxo = [
      utxo(txIn('t', 0), 1_000_000n),
      utxo(txIn('t', 1), 1_000_000n),
    ];
    const target = targetValue(900_000n);

    const { selection, remaining, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    });

    expect(selection).toHaveLength(2);
    expect(remaining).toEqual([]);
    expect(changeOutputs).toHaveLength(1);
    expect(changeOutputs[0].value.coins).toBe(1_100_000n);
    expectExactBalance(selection, target, changeOutputs);
  });

  it('throws UtxoFullyDepleted when the pool is exhausted while funding the change min-ADA', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const act = () =>
      selector.select({
        availableUtxo: [utxo(txIn('t', 0), 1_000_000n)],
        targetValue: targetValue(900_000n),
        changeAddress,
        protocolParameters: realisticProtocolParameters,
      });

    expectFailure(act, InputSelectionFailure.UtxoFullyDepleted);
  });

  it('drops underfunded empty change maps but never the asset-bearing ones', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const availableUtxo = [
      utxo(txIn('t', 0), 10_000_000n, new Map([asset(ASSET_A, 5n)])),
    ];
    const target = targetValue(8_500_000n);

    const { selection, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      outputsToCover: [output(4_250_000n), output(4_250_000n)],
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    });

    expect(changeOutputs).toHaveLength(1);
    expect(changeOutputs[0].value.assets?.get(ASSET_A)).toBe(5n);
    expect(changeOutputs[0].value.coins).toBe(1_500_000n);
    expectExactBalance(selection, target, changeOutputs);
  });

  it('drops the zero-value change output of a zero-weight map when min-ADA is zero', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 0n });
    const availableUtxo = [utxo(txIn('t', 0), 10_000_000n)];
    const target = targetValue(0n);

    const { selection, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      outputsToCover: [output(0n), output(0n)],
      changeAddress,
      protocolParameters: relaxedProtocolParameters,
    });

    expect(changeOutputs).toHaveLength(1);
    expect(changeOutputs[0].value.coins).toBe(10_000_000n);
    expectExactBalance(selection, target, changeOutputs);
  });

  it('gives all leftover ada to the last change map when every output weight is zero', () => {
    const selector = new RoundRobinRandomCoinSelector({ seed: 42n });
    const availableUtxo = [utxo(txIn('t', 0), 10_000_000n)];
    const target = targetValue(0n);

    const { selection, changeOutputs } = selector.select({
      availableUtxo,
      targetValue: target,
      outputsToCover: [output(0n), output(0n)],
      changeAddress,
      protocolParameters: realisticProtocolParameters,
    });

    expect(changeOutputs).toHaveLength(2);
    const minAda = minAdaRequired(
      changeOutputs[0],
      BigInt(realisticProtocolParameters.coinsPerUtxoByte),
    );
    expect(changeOutputs[0].value.coins).toBe(minAda);
    expect(changeOutputs[1].value.coins).toBe(10_000_000n - minAda);
    expectExactBalance(selection, target, changeOutputs);
  });
});
