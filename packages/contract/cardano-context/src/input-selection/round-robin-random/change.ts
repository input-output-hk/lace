import { minAdaRequired } from '@cardano-sdk/tx-construction';

import { splitChangeAssets } from '../change-builder';
import {
  InputSelectionError,
  InputSelectionFailure,
} from '../InputSelectionError';

import { padCoalesce, partition, reduceTokenQuantities } from './distribution';

import type { CoinSelectorProtocolParameters } from '../types';
import type { Cardano } from '@cardano-sdk/core';

/**
 * A change output under construction: its asset bundle plus the coin weight
 * it inherited from the user-specified output it mirrors. The weight drives
 * the proportional distribution of the leftover ada.
 */
type ChangeMap = {
  assets: Map<Cardano.AssetId, bigint>;
  weight: bigint;
};

/**
 * Supplies one additional lovelace-bearing UTxO from the unselected pool, or
 * `undefined` when the pool is exhausted.
 */
export type PickAdditionalAdaUtxo = () => Cardano.Utxo | undefined;

/** Parameters shared by change construction and its retry loop. */
type MakeChangeParams = {
  /** The selected UTxOs the change must return the surplus of. */
  selection: Cardano.Utxo[];
  /** The authoritative balance target; negative quantities are implicit inputs. */
  targetValue: Cardano.Value;
  /** Shape and weight hint for the change distribution. */
  outputsToCover?: Cardano.TxOut[];
  /** The address that receives all change outputs. */
  changeAddress: Cardano.PaymentAddress;
  /** Drives min-ADA and change value size limits. */
  protocolParameters: CoinSelectorProtocolParameters;
};

const positiveOrZero = (quantity: bigint): bigint =>
  quantity > 0n ? quantity : 0n;

/**
 * Collects the distinct asset ids involved in the change: the target's assets
 * first, then any asset carried by a selected input.
 */
const collectAssetIds = (
  targetValue: Cardano.Value,
  selection: Cardano.Utxo[],
): Cardano.AssetId[] => {
  const assetIds = new Set<Cardano.AssetId>(targetValue.assets?.keys());
  for (const [, output] of selection) {
    for (const assetId of output.value.assets?.keys() ?? []) {
      assetIds.add(assetId);
    }
  }
  return [...assetIds];
};

const createChangeMaps = (
  mapCount: number,
  outputsToCover: Cardano.TxOut[] | undefined,
): ChangeMap[] =>
  Array.from({ length: mapCount }, (_, mapIndex) => ({
    assets: new Map<Cardano.AssetId, bigint>(),
    weight: outputsToCover
      ? positiveOrZero(outputsToCover[mapIndex].value.coins)
      : 1n,
  }));

const assignParts = (
  maps: ChangeMap[],
  assetId: Cardano.AssetId,
  parts: bigint[],
): void => {
  for (const [mapIndex, part] of parts.entries()) {
    if (part > 0n) maps[mapIndex].assets.set(assetId, part);
  }
};

/**
 * Distributes the excess of every involved asset across the change maps.
 *
 * A user-specified asset (present in `outputsToCover` with a positive
 * quantity) is split proportionally to the per-output quantities. Any other
 * asset preserves the granularity of the selected inputs via pad-coalesce;
 * mint-like surplus from a negative target goes to the largest map, and
 * burn-like reduction is removed from the smallest quantities first.
 *
 * @throws {InputSelectionError} With `BalanceInsufficient` when the selection
 *   does not cover the target for some asset.
 */
const distributeAssetExcesses = (
  maps: ChangeMap[],
  { selection, targetValue, outputsToCover }: MakeChangeParams,
): void => {
  for (const assetId of collectAssetIds(targetValue, selection)) {
    const selectedTotal = selection.reduce(
      (total, [, output]) => total + (output.value.assets?.get(assetId) ?? 0n),
      0n,
    );
    const required = targetValue.assets?.get(assetId) ?? 0n;
    const excess = selectedTotal - required;

    if (excess < 0n) {
      throw new InputSelectionError(
        InputSelectionFailure.BalanceInsufficient,
        `Selection does not cover the target value: missing ${-excess} of asset ${assetId}`,
      );
    }
    if (excess === 0n) continue;

    const userWeights = (outputsToCover ?? []).map(output =>
      positiveOrZero(output.value.assets?.get(assetId) ?? 0n),
    );
    const userWeightTotal = userWeights.reduce(
      (total, weight) => total + weight,
      0n,
    );

    if (userWeightTotal > 0n) {
      assignParts(maps, assetId, partition(excess, userWeights));
      continue;
    }

    const inputQuantities = selection
      .map(([, output]) => output.value.assets?.get(assetId) ?? 0n)
      .filter(quantity => quantity > 0n);
    let parts =
      inputQuantities.length > 0
        ? padCoalesce(inputQuantities, maps.length)
        : maps.map(() => 0n);
    if (excess < selectedTotal) {
      parts = reduceTokenQuantities(selectedTotal - excess, parts);
    }
    if (excess > selectedTotal) {
      parts[parts.length - 1] += excess - selectedTotal;
    }
    assignParts(maps, assetId, parts);
  }
};

/**
 * Splits maps whose asset bundle exceeds the maximum serialized value size,
 * dividing the original map's coin weight evenly among the resulting parts.
 * A `maxValueSize` of `0`/`undefined` disables splitting.
 */
const splitOversizedMaps = (
  maps: ChangeMap[],
  maxValueSize: number | undefined,
): ChangeMap[] => {
  if (!maxValueSize) return maps;

  const result: ChangeMap[] = [];
  for (const map of maps) {
    const parts = splitChangeAssets(
      map.assets.size > 0 ? map.assets : undefined,
      maxValueSize,
    );
    if (parts.length === 1) {
      result.push(map);
      continue;
    }
    const partCount = BigInt(parts.length);
    const baseWeight = map.weight / partCount;
    const extraWeightedParts = map.weight % partCount;
    result.push(
      ...parts.map((assets, partIndex) => ({
        assets: assets ?? new Map<Cardano.AssetId, bigint>(),
        weight: baseWeight + (BigInt(partIndex) < extraWeightedParts ? 1n : 0n),
      })),
    );
  }
  return result;
};

/**
 * Attempts to construct the change outputs for the current selection (port of
 * the reference implementation's makeChange).
 *
 * @returns The change outputs, or `undefined` when the selected ada cannot
 *   fund the min-ADA requirement of every kept change map, so that the caller
 *   can select additional ada and retry.
 * @throws {InputSelectionError} With `BalanceInsufficient` when the selection
 *   does not cover the target for ada or some asset.
 */
const makeChange = (params: MakeChangeParams): Cardano.TxOut[] | undefined => {
  const { selection, targetValue, outputsToCover } = params;
  const { changeAddress, protocolParameters } = params;
  const outputsHint = outputsToCover?.length ? outputsToCover : undefined;
  const mapCount = outputsHint?.length ?? 1;

  const selectedCoin = selection.reduce(
    (total, [, output]) => total + output.value.coins,
    0n,
  );
  const excessCoin = selectedCoin - targetValue.coins;
  if (excessCoin < 0n) {
    throw new InputSelectionError(
      InputSelectionFailure.BalanceInsufficient,
      `Selection does not cover the target value: missing ${-excessCoin} lovelace`,
    );
  }

  let maps = createChangeMaps(mapCount, outputsHint);
  distributeAssetExcesses(maps, params);

  if (excessCoin === 0n && maps.every(map => map.assets.size === 0)) {
    return [];
  }

  maps = splitOversizedMaps(maps, protocolParameters.maxValueSize);
  maps.sort((a, b) => a.assets.size - b.assets.size);

  const coinsPerUtxoByte = BigInt(protocolParameters.coinsPerUtxoByte);
  const minAdas = maps.map(map =>
    minAdaRequired(
      {
        address: changeAddress,
        value: {
          coins: 0n,
          ...(map.assets.size > 0 ? { assets: map.assets } : {}),
        },
      },
      coinsPerUtxoByte,
    ),
  );

  let totalMinAda = minAdas.reduce((total, minAda) => total + minAda, 0n);
  let firstMap = 0;
  while (
    excessCoin < totalMinAda &&
    firstMap < maps.length - 1 &&
    maps[firstMap].assets.size === 0
  ) {
    totalMinAda -= minAdas[firstMap];
    firstMap += 1;
  }

  if (excessCoin < totalMinAda) return undefined;

  const keptMaps = maps.slice(firstMap);
  const keptMinAdas = minAdas.slice(firstMap);
  const adaRemaining = excessCoin - totalMinAda;
  const weightTotal = keptMaps.reduce((total, map) => total + map.weight, 0n);
  const shares =
    weightTotal > 0n
      ? partition(
          adaRemaining,
          keptMaps.map(map => map.weight),
        )
      : keptMaps.map((_, mapIndex) =>
          mapIndex === keptMaps.length - 1 ? adaRemaining : 0n,
        );

  return keptMaps.map((map, mapIndex) => ({
    address: changeAddress,
    value: {
      coins: keptMinAdas[mapIndex] + shares[mapIndex],
      ...(map.assets.size > 0 ? { assets: map.assets } : {}),
    },
  }));
};

/**
 * Drops zero-value outputs: with a zero min-ADA requirement, a change map
 * that receives no coin share and holds no assets would otherwise surface as
 * an empty output.
 */
const withoutEmptyValues = (outputs: Cardano.TxOut[]): Cardano.TxOut[] =>
  outputs.filter(
    ({ value }) => value.coins > 0n || (value.assets?.size ?? 0) > 0,
  );

/**
 * Generates the change outputs, selecting one additional ada UTxO and
 * retrying while change cannot be constructed, or while the number of change
 * outputs is fewer than the number of user-specified outputs (port of the
 * reference implementation's makeChangeRepeatedly).
 *
 * @param params - Change construction parameters; `selection` grows in place
 *   as additional ada is selected.
 * @param pickAdditionalAdaUtxo - Supplies one more lovelace-bearing UTxO, or
 *   `undefined` when the pool is exhausted.
 * @param maxAdditionalUtxo - Upper bound on additional picks, normally the
 *   pool size. Guards the retry loop against a picker that never signals
 *   exhaustion.
 * @returns Min-ADA compliant change outputs, zero-value outputs excluded;
 *   possibly fewer than desired when the pool ran out while mimicking the
 *   user output shape.
 * @throws {InputSelectionError} `UtxoFullyDepleted` when the pool is
 *   exhausted before valid change can be constructed; `BalanceInsufficient`
 *   when the selection does not cover the target.
 */
export const generateChangeWithRetries = (
  params: MakeChangeParams,
  pickAdditionalAdaUtxo: PickAdditionalAdaUtxo,
  maxAdditionalUtxo: number,
): Cardano.TxOut[] => {
  const desiredChangeCount = Math.max(params.outputsToCover?.length ?? 0, 1);

  for (let iteration = 0; iteration <= maxAdditionalUtxo; iteration++) {
    const changeOutputs = makeChange(params);

    if (changeOutputs) {
      if (changeOutputs.length >= desiredChangeCount) {
        return withoutEmptyValues(changeOutputs);
      }
      const extraUtxo = pickAdditionalAdaUtxo();
      if (!extraUtxo) return withoutEmptyValues(changeOutputs);
      params.selection.push(extraUtxo);
      continue;
    }

    const extraUtxo = pickAdditionalAdaUtxo();
    if (!extraUtxo) {
      throw new InputSelectionError(
        InputSelectionFailure.UtxoFullyDepleted,
        'UTxO pool exhausted while funding the minimum UTxO value of the change outputs',
      );
    }
    params.selection.push(extraUtxo);
  }

  throw new Error(
    `Change generation exceeded the UTxO pool bound of ${maxAdditionalUtxo} additional picks; the UTxO picker failed to signal exhaustion`,
  );
};
