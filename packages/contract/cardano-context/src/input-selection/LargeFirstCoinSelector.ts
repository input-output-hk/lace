import { coalesceValueQuantities } from '@cardano-sdk/core';

import type {
  CoinSelector,
  CoinSelectorParams,
  CoinSelectorResult,
} from './types';
import type { Cardano } from '@cardano-sdk/core';

/**
 * Computes the total aggregated value of a list of UTxOs.
 *
 * This utility merges all UTxO output values into a single {@link Cardano.Value},
 * summing both ADA (coins) and all native assets across all provided inputs.
 *
 * @param utxos - The list of UTxOs to aggregate.
 * @returns A value representing the combined total of all UTxOs.
 */
const valueOf = (utxos: Cardano.Utxo[]): Cardano.Value =>
  coalesceValueQuantities(utxos.map(([, out]) => out.value));

/**
 * Retrieves the quantity of a specific native asset from a given {@link Cardano.Value}.
 *
 * If the asset is not present in the `assets` map, the function returns `0n`.
 *
 * @param v - The value object to inspect.
 * @param id - The asset id identifying the native asset.
 * @returns The quantity of the specified asset (as a bigint), or `0n` if absent.
 */
const getAssetAmount = (v: Cardano.Value, id: Cardano.AssetId): bigint =>
  v.assets?.get(id) ?? 0n;

/**
 * Generic comparator for sorting bigint values in descending order.
 *
 * @param a - First bigint.
 * @param b - Second bigint.
 * @returns -1 if `a > b`, 1 if `a < b`, or 0 if equal.
 */
const compareBigIntDesc = (a: bigint, b: bigint): number =>
  a > b ? -1 : a < b ? 1 : 0;

/**
 * Comparator for sorting UTxOs in descending order of ADA (lovelace) amount.
 *
 * UTxOs with higher ADA values appear earlier in the array.
 *
 * @param a - The first UTxO to compare.
 * @param b - The second UTxO to compare.
 * @returns -1, 0, or 1 (descending order comparator).
 */
const byDescendingAda = (a: Cardano.Utxo, b: Cardano.Utxo) => {
  const ac = a[1].value.coins ?? 0n;
  const bc = b[1].value.coins ?? 0n;
  return compareBigIntDesc(ac, bc);
};

/**
 * Creates a comparator that sorts UTxOs by descending quantity of a specific native asset.
 *
 * If two UTxOs hold the same amount of the asset, it falls back to comparing ADA value (also descending).
 *
 * @param assetId - The asset id used as the primary sort key.
 * @returns A comparator suitable for `Array.prototype.sort()`.
 */
const byDescendingAsset =
  (assetId: Cardano.AssetId) => (a: Cardano.Utxo, b: Cardano.Utxo) => {
    const av = getAssetAmount(a[1].value, assetId);
    const bv = getAssetAmount(b[1].value, assetId);
    const primary = compareBigIntDesc(av, bv);
    if (primary !== 0) return primary;

    const ac = a[1].value.coins ?? 0n;
    const bc = b[1].value.coins ?? 0n;
    return compareBigIntDesc(ac, bc);
  };

/**
 * Utility that partitions a list of UTxOs into two arrays:
 * those that satisfy a predicate (`picked`) and those that do not (`rest`).
 *
 * @param utxos - List of UTxOs to evaluate.
 * @param take - Predicate function that determines which UTxOs are picked.
 * @returns An object with `picked` and `rest` arrays.
 */
const pickBy = (
  utxos: Cardano.Utxo[],
  take: (u: Cardano.Utxo) => boolean,
): { picked: Cardano.Utxo[]; rest: Cardano.Utxo[] } => {
  const picked: Cardano.Utxo[] = [];
  const rest: Cardano.Utxo[] = [];
  for (const u of utxos) (take(u) ? picked : rest).push(u);
  return { picked, rest };
};

/**
 * Implements the **Largest-First Coin Selection** strategy for UTxO-based transactions.
 *
 * This algorithm prioritizes selecting the largest UTxOs first to minimize the number of inputs.
 * It supports both ADA and multi-asset selection and proceeds in two distinct phases:
 *
 * 1. **Native Asset Phase** — Selects UTxOs containing the required native assets until the
 *    target quantity for each asset is met or exceeded.
 * 2. **ADA Phase** — Once asset requirements are satisfied, selects UTxOs by descending ADA value
 *    until the total required ADA (including fees and min-UTxO requirements) is fulfilled.
 *
 * @remarks
 * - Preselected UTxOs (`preSelectedUtxo`) are always preserved and excluded from further selection.
 * - Throws errors when balance is insufficient for either assets or ADA.
 * - Deterministic given a fixed set of inputs.
 *
 * @throws {Error} When there is insufficient balance for a required asset or for ADA.
 */
export class LargeFirstCoinSelector implements CoinSelector {
  /**
   * Executes the coin selection process.
   *
   * @param params - See {@link CoinSelectorParams}.
   * @returns An object containing the selected UTxOs (`selection`) and the remaining available ones.
   */
  public select({
    preSelectedUtxo,
    availableUtxo,
    targetValue,
  }: CoinSelectorParams): CoinSelectorResult {
    const selection: Cardano.Utxo[] = [...(preSelectedUtxo ?? [])];

    const key = (input: Cardano.TxIn) => `${input.txId}:${input.index}`;
    const preselectedKeys = new Set(selection.map(([input]) => key(input)));
    let remaining: Cardano.Utxo[] = availableUtxo.filter(
      ([input]) => !preselectedKeys.has(key(input)),
    );

    const requiredAssets = [...(targetValue.assets?.entries() ?? [])]
      .filter(([, qty]) => qty > 0n)
      .map(([id, qty]) => ({ id, qty }));

    let current = valueOf(selection);

    for (const { id, qty } of requiredAssets) {
      let have = getAssetAmount(current, id);
      if (have >= qty) continue;

      const sorted = [...remaining].sort(byDescendingAsset(id));
      const { rest } = pickBy(sorted, u => {
        if (have >= qty) return false;
        const amt = getAssetAmount(u[1].value, id);
        if (amt <= 0n) return false;

        selection.push(u);
        current = coalesceValueQuantities([current, u[1].value]);
        have += amt;
        return true;
      });

      remaining = rest;

      if (have < qty) {
        throw new Error(`Insufficient balance for asset ${id}`);
      }
    }

    const needAda = (targetValue.coins ?? 0n) - (current.coins ?? 0n);

    if (needAda > 0n) {
      let deficit = needAda;
      const sorted = [...remaining].sort(byDescendingAda);

      const { rest } = pickBy(sorted, u => {
        if (deficit <= 0n) return false;
        const ada = u[1].value.coins ?? 0n;
        if (ada <= 0n) return false;

        selection.push(u);
        current = coalesceValueQuantities([current, u[1].value]);
        deficit -= ada;
        return true;
      });

      remaining = rest;

      if (deficit > 0n) {
        throw new Error('Insufficient ADA');
      }
    }

    return { selection, remaining };
  }
}
