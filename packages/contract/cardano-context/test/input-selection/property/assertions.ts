import { Serialization } from '@cardano-sdk/core';
import { minAdaRequired } from '@cardano-sdk/tx-construction';
import { expect } from 'vitest';

import {
  InputSelectionError,
  InputSelectionFailure,
} from '../../../src/input-selection/InputSelectionError';

import type {
  CoinSelector,
  CoinSelectorParams,
  CoinSelectorResult,
} from '../../../src/input-selection/types';
import type { Cardano } from '@cardano-sdk/core';

type Totals = { coins: bigint; assets: Map<Cardano.AssetId, bigint> };

const totalOf = (values: Cardano.Value[]): Totals => {
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

const utxoKey = ([input]: Cardano.Utxo): string =>
  `${input.txId}:${input.index}`;

/**
 * The effective pool the selectors operate on: the union of the available and
 * pre-selected UTxOs deduplicated by `txId:index`, with the pre-selected
 * instance winning key collisions, mirroring both selectors.
 */
const poolOf = ({
  availableUtxo,
  preSelectedUtxo,
}: CoinSelectorParams): Cardano.Utxo[] => {
  const byKey = new Map<string, Cardano.Utxo>();
  for (const entry of preSelectedUtxo ?? []) byKey.set(utxoKey(entry), entry);
  for (const entry of availableUtxo) {
    const key = utxoKey(entry);
    if (!byKey.has(key)) byKey.set(key, entry);
  }
  return [...byKey.values()];
};

const assertCoverage = (selected: Totals, required: Totals): void => {
  const requiredCoins = required.coins > 0n ? required.coins : 0n;
  expect(selected.coins).toBeGreaterThanOrEqual(requiredCoins);
  for (const [id, quantity] of required.assets) {
    if (quantity > 0n) {
      expect(selected.assets.get(id) ?? 0n).toBeGreaterThanOrEqual(quantity);
    }
  }
};

const assertExactBalance = (
  selected: Totals,
  required: Totals,
  change: Totals,
): void => {
  expect(selected.coins).toBe(required.coins + change.coins);
  const assetIds = new Set([
    ...selected.assets.keys(),
    ...required.assets.keys(),
    ...change.assets.keys(),
  ]);
  for (const id of assetIds) {
    expect(selected.assets.get(id) ?? 0n).toBe(
      (required.assets.get(id) ?? 0n) + (change.assets.get(id) ?? 0n),
    );
  }
};

const assertUtxoConservation = (
  params: CoinSelectorParams,
  { selection, remaining }: CoinSelectorResult,
): void => {
  const poolKeys = new Set(poolOf(params).map(utxoKey));
  const selectedKeys = new Set(selection.map(utxoKey));
  const remainingKeys = new Set(remaining.map(utxoKey));
  expect(selectedKeys.size).toBe(selection.length);
  expect(remainingKeys.size).toBe(remaining.length);
  expect(selection.length + remaining.length).toBe(poolKeys.size);
  for (const key of poolKeys) {
    expect(selectedKeys.has(key) !== remainingKeys.has(key)).toBe(true);
  }
  for (const entry of params.preSelectedUtxo ?? []) {
    expect(selectedKeys.has(utxoKey(entry))).toBe(true);
  }
};

const assertChangeValidity = (
  params: CoinSelectorParams,
  changeOutputs: Cardano.TxOut[],
): void => {
  const { coinsPerUtxoByte, maxValueSize } = params.protocolParameters;
  for (const change of changeOutputs) {
    expect(change.address).toBe(params.changeAddress);
    expect(change.value.coins).toBeGreaterThanOrEqual(
      minAdaRequired(change, BigInt(coinsPerUtxoByte)),
    );
    for (const quantity of change.value.assets?.values() ?? []) {
      expect(quantity).toBeGreaterThan(0n);
    }
    expect(
      change.value.coins > 0n || (change.value.assets?.size ?? 0) > 0,
    ).toBe(true);
    if (maxValueSize > 0) {
      const serializedSize =
        Serialization.Value.fromCore(change.value).toCbor().length / 2;
      expect(serializedSize).toBeLessThanOrEqual(maxValueSize);
    }
  }
};

/**
 * Asserts every contract property of a successful selection: coverage of the
 * target, exact balance (selection === target + change, coins and every asset,
 * negative target quantities flowing into change), key-based UTxO conservation
 * over the deduplicated pool, change validity (address, min-ADA, positive
 * quantities, no empty values, serialized size within `maxValueSize`) and a
 * non-empty selection whenever the target requires any positive quantity.
 */
export const assertCoinSelectorProperties = (
  params: CoinSelectorParams,
  result: CoinSelectorResult,
): void => {
  const selected = totalOf(result.selection.map(([, output]) => output.value));
  const required = totalOf([params.targetValue]);
  const change = totalOf(result.changeOutputs.map(output => output.value));

  assertCoverage(selected, required);
  assertExactBalance(selected, required, change);
  assertUtxoConservation(params, result);
  assertChangeValidity(params, result.changeOutputs);

  const hasPositiveRequirement =
    required.coins > 0n ||
    [...required.assets.values()].some(quantity => quantity > 0n);
  if (hasPositiveRequirement) {
    expect(result.selection.length).toBeGreaterThan(0);
  }
};

/**
 * Asserts that a shape-mimicking selector produced at least as many change
 * outputs as user outputs, whenever a conservative sufficient condition
 * guarantees it must: no value size splitting (`maxValueSize === 0`), a
 * positive `coinsPerUtxoByte` (so no change map collapses to a zero value)
 * and total change coins of at least `outputsToCover.length` times the
 * min-ADA of a single output holding all the change assets, which bounds the
 * min-ADA of every individual change map.
 *
 * @returns `true` when the condition applied and the law was asserted.
 */
export const assertChangeCountMimicsOutputs = (
  params: CoinSelectorParams,
  result: CoinSelectorResult,
): boolean => {
  const outputCount = params.outputsToCover?.length ?? 0;
  const { coinsPerUtxoByte, maxValueSize } = params.protocolParameters;
  if (outputCount === 0 || coinsPerUtxoByte === 0 || maxValueSize !== 0) {
    return false;
  }

  const change = totalOf(result.changeOutputs.map(output => output.value));
  const minAdaUpperBound = minAdaRequired(
    {
      address: params.changeAddress,
      value: {
        coins: 0n,
        ...(change.assets.size > 0 ? { assets: change.assets } : {}),
      },
    },
    BigInt(coinsPerUtxoByte),
  );
  if (change.coins < BigInt(outputCount) * minAdaUpperBound) return false;

  expect(result.changeOutputs.length).toBeGreaterThanOrEqual(outputCount);
  return true;
};

const assertBalanceInsufficientJustified = (
  params: CoinSelectorParams,
): void => {
  const pool = poolOf(params);
  const available = totalOf(pool.map(([, output]) => output.value));
  const required = totalOf([params.targetValue]);

  const isCoinInsufficient = available.coins < required.coins;
  const isAssetInsufficient = [...required.assets].some(
    ([id, quantity]) =>
      quantity > 0n && (available.assets.get(id) ?? 0n) < quantity,
  );
  const hasPositiveRequirement =
    required.coins > 0n ||
    [...required.assets.values()].some(quantity => quantity > 0n);
  const didForcedLovelacePickFail =
    !hasPositiveRequirement &&
    (params.preSelectedUtxo ?? []).length === 0 &&
    !pool.some(([, output]) => output.value.coins > 0n);

  expect(
    isCoinInsufficient || isAssetInsufficient || didForcedLovelacePickFail,
  ).toBe(true);
};

/**
 * Checks the arithmetic necessary condition for `UtxoFullyDepleted`: even if
 * the entire pool were selected, the resulting change coins could not fund
 * the min-ADA of the change outputs.
 *
 * The min-ADA budget must upper-bound every grouping a selector's heuristic
 * can produce: the recursive-halving split is sensitive to asset entry order,
 * and each selector iterates the change assets in a different order. Because
 * min-ADA is subadditive under merging parts (merged parts share the address
 * and output overhead) and no split yields more parts than assets, the sum of
 * single-asset part requirements bounds any grouping. It is scaled by the
 * user output count because change construction may mimic the payment output
 * shape, distributing each asset across up to one map per output.
 */
const isChangeUnfundableWithWholePool = (
  params: CoinSelectorParams,
): boolean => {
  const available = totalOf(poolOf(params).map(([, output]) => output.value));
  const required = totalOf([params.targetValue]);

  const changeCoins = available.coins - required.coins;
  const changeAssets = new Map<Cardano.AssetId, bigint>();
  const assetIds = new Set([
    ...available.assets.keys(),
    ...required.assets.keys(),
  ]);
  for (const id of assetIds) {
    const excess =
      (available.assets.get(id) ?? 0n) - (required.assets.get(id) ?? 0n);
    if (excess > 0n) changeAssets.set(id, excess);
  }

  if (changeCoins === 0n && changeAssets.size === 0) return false;

  const parts: Array<Cardano.TokenMap | undefined> =
    changeAssets.size === 0
      ? [undefined]
      : params.protocolParameters.maxValueSize
      ? [...changeAssets].map(([id, quantity]) => new Map([[id, quantity]]))
      : [changeAssets];
  const coinsPerUtxoByte = BigInt(params.protocolParameters.coinsPerUtxoByte);
  const totalMinAda = parts.reduce(
    (total, assets) =>
      total +
      minAdaRequired(
        {
          address: params.changeAddress,
          value: { coins: 0n, ...(assets ? { assets } : {}) },
        },
        coinsPerUtxoByte,
      ),
    0n,
  );
  const desiredChangeCount = BigInt(
    Math.max(params.outputsToCover?.length ?? 1, 1),
  );

  return changeCoins < totalMinAda * desiredChangeCount;
};

const assertUtxoFullyDepletedJustified = (
  params: CoinSelectorParams,
  createSelector: () => CoinSelector,
): void => {
  const relaxedParams: CoinSelectorParams = {
    ...params,
    protocolParameters: { coinsPerUtxoByte: 0, maxValueSize: 0 },
  };

  let didRelaxedRunFailWithBalanceInsufficient = false;
  let relaxedResult: CoinSelectorResult | undefined;
  try {
    relaxedResult = createSelector().select(relaxedParams);
  } catch (relaxedError) {
    expect(relaxedError).toBeInstanceOf(InputSelectionError);
    expect((relaxedError as InputSelectionError).failure).toBe(
      InputSelectionFailure.BalanceInsufficient,
    );
    didRelaxedRunFailWithBalanceInsufficient = true;
  }
  if (relaxedResult) {
    assertCoinSelectorProperties(relaxedParams, relaxedResult);
  }

  expect(
    isChangeUnfundableWithWholePool(params) ||
      didRelaxedRunFailWithBalanceInsufficient,
  ).toBe(true);
};

/**
 * Asserts a thrown {@link InputSelectionError} is genuinely justified:
 * `BalanceInsufficient` requires the deduplicated pool (pre-selected entries
 * included) to actually fall short of the target coin or of some required
 * asset, or -- when nothing positive is required, so only the forced lovelace
 * pick remains -- to hold no lovelace-bearing UTxO at all. `UtxoFullyDepleted`
 * requires that even selecting the whole pool could not fund the change
 * min-ADA, or that re-running the same selector with min-ADA and value size
 * limits lifted fails with `BalanceInsufficient`.
 */
export const assertFailureProperties = (
  params: CoinSelectorParams,
  error: InputSelectionError,
  createSelector: () => CoinSelector,
): void => {
  switch (error.failure) {
    case InputSelectionFailure.BalanceInsufficient:
      assertBalanceInsufficientJustified(params);
      return;
    case InputSelectionFailure.UtxoFullyDepleted:
      assertUtxoFullyDepletedJustified(params, createSelector);
      return;
    default:
      throw error;
  }
};
