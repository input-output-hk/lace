// Ported from Biglup/cardano-account-custody-contract offchain/src/value.ts at
// revision b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for
// Lace: lovelace and tokens are held apart, asset ids are normalised to lower
// case, and an asset class is matched by its parts, never by concatenation.

import { isCustodyLovelaceAsset } from '../state/rules';

import type { CustodyAsset } from '../codecs/account-state';
import type { Cardano } from '@cardano-sdk/core';

/**
 * A signed quantity per asset class, such as the net value leaving an
 * address: a negative quantity is a net inflow. Zero token quantities are
 * absent, so equal deltas hold the same entries. Asset ids are lower-case
 * hex.
 */
export interface CustodyValueDelta {
  readonly lovelace: bigint;
  readonly assets: ReadonlyMap<Cardano.AssetId, bigint>;
}

/** Hex length of a policy id: every asset class on chain has a 28-byte one. */
const POLICY_ID_HEX_LENGTH = 56;

export const valueDeltaOf = (value: Cardano.Value): CustodyValueDelta =>
  addValueDeltas([
    {
      lovelace: value.coins,
      assets: new Map(
        [...(value.assets ?? new Map<Cardano.AssetId, bigint>())].map(
          ([assetId, quantity]) => [
            assetId.toLowerCase() as Cardano.AssetId,
            quantity,
          ],
        ),
      ),
    },
  ]);

/** The sum of deltas, with zero token quantities dropped. */
export const addValueDeltas = (
  deltas: readonly CustodyValueDelta[],
): CustodyValueDelta => {
  let lovelace = 0n;
  const assets = new Map<Cardano.AssetId, bigint>();
  for (const delta of deltas) {
    lovelace += delta.lovelace;
    for (const [assetId, quantity] of delta.assets) {
      const sum = (assets.get(assetId) ?? 0n) + quantity;
      if (sum === 0n) {
        assets.delete(assetId);
      } else {
        assets.set(assetId, sum);
      }
    }
  }
  return { lovelace, assets };
};

export const negateValueDelta = (
  delta: CustodyValueDelta,
): CustodyValueDelta => ({
  lovelace: -delta.lovelace,
  assets: new Map(
    [...delta.assets].map(([assetId, quantity]) => [assetId, -quantity]),
  ),
});

/** The policy id of an asset id. */
export const policyIdOf = (assetId: Cardano.AssetId): string =>
  assetId.slice(0, POLICY_ID_HEX_LENGTH);

/** The asset name of an asset id, as hex. */
export const assetNameOf = (assetId: Cardano.AssetId): string =>
  assetId.slice(POLICY_ID_HEX_LENGTH);

/**
 * Whether an asset id names an asset class. Compared by parts, so an asset
 * whose policy id is not 28 bytes, which no value can hold, matches nothing.
 */
export const isAssetIdOf = (
  assetId: Cardano.AssetId,
  asset: CustodyAsset,
): boolean =>
  asset.policyId.length === POLICY_ID_HEX_LENGTH &&
  policyIdOf(assetId) === asset.policyId &&
  assetNameOf(assetId) === asset.assetName;

/** The quantity of one asset class: `assets.quantity_of` of the contract. */
export const quantityOfAsset = (
  delta: CustodyValueDelta,
  asset: CustodyAsset,
): bigint => {
  if (isCustodyLovelaceAsset(asset)) return delta.lovelace;
  for (const [assetId, quantity] of delta.assets) {
    if (isAssetIdOf(assetId, asset)) return quantity;
  }
  return 0n;
};
