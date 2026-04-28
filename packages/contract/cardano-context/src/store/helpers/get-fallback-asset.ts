import { Cardano } from '@cardano-sdk/core';

import type { Asset, AssetProvider } from '@cardano-sdk/core';

/**
 * Retrieves a fallback asset object based on the provided asset ID.
 *
 * This function derives details of the asset, including its policy ID,
 * asset name, fingerprint, and initializes the quantity and supply
 * to default values. It serves as a utility for creating a default
 * representation of an asset when specific details are unavailable.
 *
 * @param {Cardano.AssetId} assetId - The unique identifier of the asset.
 * @returns {Asset.AssetInfo} An object representing the fallback AssetInfo, including:
 * - assetId: The provided asset ID.
 * - fingerprint: The unique fingerprint generated from the policy ID and asset name.
 * - name: The extracted asset name.
 * - policyId: The policy ID extracted from the asset ID.
 * - quantity: The default quantity of the asset, set to BigInt(0).
 * - supply: The default total supply of the asset, set to BigInt(0).
 */
export const getFallbackAsset = (assetId: Cardano.AssetId): Asset.AssetInfo => {
  const policyId = Cardano.AssetId.getPolicyId(assetId);
  const name = Cardano.AssetId.getAssetName(assetId);

  return {
    assetId,
    fingerprint: Cardano.AssetFingerprint.fromParts(policyId, name),
    name,
    policyId,
    quantity: BigInt(0),
    supply: BigInt(0),
  };
};

/**
 * A dummy asset provider that returns fallback assets for all asset IDs.
 *
 * This provider is used in the transaction summary inspector to provide minimal asset information
 * when the actual asset provider fails to fetch assets. It ensures that the transaction summary
 * inspector can still process the transaction even if asset information is not available.
 */
export const assetProvider: AssetProvider = {
  getAsset: async ({ assetId }) => getFallbackAsset(assetId),
  getAssets: async ({ assetIds }) => assetIds.map(id => getFallbackAsset(id)),
  healthCheck: async () => Promise.resolve({ ok: true }),
};
