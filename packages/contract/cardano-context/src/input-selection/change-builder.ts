import {
  coalesceValueQuantities,
  Serialization,
  subtractValueQuantities,
} from '@cardano-sdk/core';
import { minAdaRequired } from '@cardano-sdk/tx-construction';

import {
  InputSelectionError,
  InputSelectionFailure,
} from './InputSelectionError';

import type {
  CoinSelectorProtocolParameters,
  CoinSelectorResult,
} from './types';
import type { Cardano } from '@cardano-sdk/core';

/**
 * The largest ada quantity a transaction output can carry (the total lovelace
 * supply). Used to measure change value sizes conservatively, because the
 * final coin of a change output is not known while its assets are split.
 */
const MAX_OUTPUT_COIN = 45_000_000_000_000_000n;

/**
 * Parameters for {@link buildChangeOutputs}.
 *
 * @property selection - The UTxOs picked by the selection phases.
 * @property remaining - The UTxOs still available; may be drawn from to fund
 *   the min-ADA requirement of the change outputs.
 * @property targetValue - The value the selection must cover exactly (surplus
 *   becomes change).
 * @property changeAddress - Address that receives all change outputs.
 * @property protocolParameters - Drives min-ADA and change value size limits.
 */
type BuildChangeOutputsParams = {
  selection: Cardano.Utxo[];
  remaining: Cardano.Utxo[];
  targetValue: Cardano.Value;
  changeAddress: Cardano.PaymentAddress;
  protocolParameters: CoinSelectorProtocolParameters;
};

/**
 * Computes the total aggregated value of a list of UTxOs.
 *
 * @param utxos - The list of UTxOs to aggregate.
 * @returns A value representing the combined total of all UTxOs.
 */
const totalValueOf = (utxos: Cardano.Utxo[]): Cardano.Value =>
  coalesceValueQuantities(utxos.map(([, out]) => out.value));

/**
 * Checks whether a value is exactly zero for both ADA and all assets.
 *
 * @param value - Value to test.
 * @returns `true` if `coins === 0n` and all asset quantities are `0n`.
 */
const isZeroValue = (value: Cardano.Value): boolean => {
  if (value.coins !== 0n) return false;
  if (value.assets) {
    for (const amount of value.assets.values()) {
      if (amount !== 0n) return false;
    }
  }
  return true;
};

/**
 * Asserts that the change value has no negative component, i.e. the selection
 * actually covers the target for coins and every asset.
 *
 * @param change - The computed change value (`selection - target`).
 * @throws {InputSelectionError} With `BalanceInsufficient` when any component
 *   is negative.
 */
const assertCoversTarget = (change: Cardano.Value): void => {
  if (change.coins < 0n) {
    throw new InputSelectionError(
      InputSelectionFailure.BalanceInsufficient,
      `Selection does not cover the target value: missing ${-change.coins} lovelace`,
    );
  }
  for (const [id, quantity] of change.assets ?? []) {
    if (quantity < 0n) {
      throw new InputSelectionError(
        InputSelectionFailure.BalanceInsufficient,
        `Selection does not cover the target value: missing ${-quantity} of asset ${id}`,
      );
    }
  }
};

/**
 * Checks whether a change value holding the given assets would exceed the
 * protocol's maximum serialized value size, assuming the largest possible
 * ada quantity.
 *
 * @param assets - The asset bundle the change output would hold.
 * @param maxValueSize - The protocol's maximum serialized value size, in bytes.
 * @returns `true` if the serialized value would exceed `maxValueSize`.
 */
const isOversizedValue = (
  assets: Cardano.TokenMap,
  maxValueSize: number,
): boolean => {
  const cbor = Serialization.Value.fromCore({
    coins: MAX_OUTPUT_COIN,
    assets,
  }).toCbor();
  return cbor.length / 2 > maxValueSize;
};

/**
 * Splits a change asset bundle into parts that each fit within the maximum
 * serialized value size, by recursively halving oversized bundles.
 *
 * A part holding a single asset is never split further. A `maxValueSize` of
 * `0`/`undefined` disables splitting, as does an empty bundle.
 *
 * @param assets - The change assets to split, if any.
 * @param maxValueSize - The protocol's maximum serialized value size, in bytes.
 * @returns The asset bundles of the resulting change outputs; a single
 *   `undefined` entry represents coin-only change.
 */
export const splitChangeAssets = (
  assets: Cardano.TokenMap | undefined,
  maxValueSize: number | undefined,
): Array<Cardano.TokenMap | undefined> => {
  if (!assets || assets.size === 0) return [undefined];
  if (!maxValueSize) return [assets];

  const parts: Cardano.TokenMap[] = [];
  const pending: Cardano.TokenMap[] = [assets];
  while (pending.length > 0) {
    const candidate = pending.shift() as Cardano.TokenMap;
    if (candidate.size >= 2 && isOversizedValue(candidate, maxValueSize)) {
      const entries = [...candidate.entries()];
      const half = Math.floor(entries.length / 2);
      pending.push(new Map(entries.slice(0, half)));
      pending.push(new Map(entries.slice(half)));
    } else {
      parts.push(candidate);
    }
  }
  return parts;
};

/**
 * Moves the UTxO with the largest lovelace amount from `remaining` into
 * `selection`, mutating both arrays.
 *
 * @param selection - The selection to grow.
 * @param remaining - The pool to draw from.
 * @returns The value of the moved UTxO.
 * @throws {InputSelectionError} With `UtxoFullyDepleted` when the pool is
 *   exhausted or holds no more lovelace.
 */
const moveLargestCoinUtxo = (
  selection: Cardano.Utxo[],
  remaining: Cardano.Utxo[],
): Cardano.Value => {
  let largestIndex = -1;
  for (let index = 0; index < remaining.length; index++) {
    if (
      largestIndex < 0 ||
      remaining[index][1].value.coins > remaining[largestIndex][1].value.coins
    ) {
      largestIndex = index;
    }
  }

  if (largestIndex < 0 || remaining[largestIndex][1].value.coins === 0n) {
    throw new InputSelectionError(
      InputSelectionFailure.UtxoFullyDepleted,
      'UTxO pool exhausted while funding the minimum UTxO value of the change outputs',
    );
  }

  const [moved] = remaining.splice(largestIndex, 1);
  selection.push(moved);
  return moved[1].value;
};

/**
 * Builds the min-ADA compliant change outputs for a completed selection.
 *
 * Computes `change = sum(selection) - targetValue` and returns it as change
 * outputs at `changeAddress`:
 * - Zero change yields no outputs.
 * - Asset bundles exceeding `maxValueSize` are split across multiple outputs
 *   by recursive halving.
 * - Each output is assigned its min-ADA requirement; the first output
 *   additionally receives the coin remainder, so the outputs sum exactly to
 *   the change value.
 * - When the change coin cannot fund the min-ADA of every output, additional
 *   UTxOs are moved from `remaining` into `selection`, largest lovelace
 *   first, and the change is recomputed.
 *
 * @param params - See {@link BuildChangeOutputsParams}.
 * @returns The final selection, remaining pool, and change outputs.
 * @throws {InputSelectionError} `BalanceInsufficient` when the selection does
 *   not cover the target; `UtxoFullyDepleted` when `remaining` runs out while
 *   funding min-ADA.
 */
export const buildChangeOutputs = ({
  selection,
  remaining,
  targetValue,
  changeAddress,
  protocolParameters,
}: BuildChangeOutputsParams): CoinSelectorResult => {
  const finalSelection = [...selection];
  const finalRemaining = [...remaining];

  let change: Cardano.Value = subtractValueQuantities([
    totalValueOf(finalSelection),
    targetValue,
  ]);
  assertCoversTarget(change);

  if (isZeroValue(change)) {
    return {
      selection: finalSelection,
      remaining: finalRemaining,
      changeOutputs: [],
    };
  }

  const coinsPerUtxoByte = BigInt(protocolParameters.coinsPerUtxoByte);

  let parts: Array<Cardano.TokenMap | undefined>;
  let minAdaPerPart: bigint[];
  let totalMinAda: bigint;

  // Consuming a UTxO can add assets to the change, so the split and the
  // min-ADA requirements are recomputed on every iteration. Each iteration
  // consumes one UTxO from the remaining pool, bounding the loop.
  const maxIterations = finalRemaining.length + 1;
  for (let iteration = 0; ; iteration++) {
    if (iteration >= maxIterations) {
      throw new Error(
        'Change construction exceeded the UTxO pool bound; the top-up loop failed to terminate',
      );
    }
    parts = splitChangeAssets(change.assets, protocolParameters.maxValueSize);
    minAdaPerPart = parts.map(assets =>
      minAdaRequired(
        { address: changeAddress, value: { coins: 0n, assets } },
        coinsPerUtxoByte,
      ),
    );
    totalMinAda = minAdaPerPart.reduce((total, minAda) => total + minAda, 0n);

    if (change.coins >= totalMinAda) break;

    change = coalesceValueQuantities([
      change,
      moveLargestCoinUtxo(finalSelection, finalRemaining),
    ]);
  }

  const remainder = change.coins - totalMinAda;
  const changeOutputs = parts.map((assets, index) => ({
    address: changeAddress,
    value: {
      coins: index === 0 ? minAdaPerPart[0] + remainder : minAdaPerPart[index],
      ...(assets ? { assets } : {}),
    },
  }));

  return {
    selection: finalSelection,
    remaining: finalRemaining,
    changeOutputs,
  };
};
