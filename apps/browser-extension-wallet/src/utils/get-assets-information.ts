import { Wallet } from '@lace/cardano';
import chunk from 'lodash/chunk';
import { logger } from '@lace/common';

export type TokenInfo = Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>;
interface AssetExtraData {
  nftMetadata?: boolean;
  tokenMetadata?: boolean;
  history?: boolean;
}

const FETCH_ASSET_LIMIT = 100;

export const getAssetsInformation = async (
  ids: Wallet.Cardano.AssetId[],
  assetsInfo: Wallet.Assets,
  { assetProvider, extraData }: { assetProvider: Wallet.AssetProvider; extraData?: AssetExtraData }
): Promise<TokenInfo> => {
  const assetsInformation: Wallet.Asset.AssetInfo[] = [];
  const fetchedAssets: Wallet.Asset.AssetInfo[] = [];
  const assetsNotFound: Wallet.Cardano.AssetId[] = [];

  for (const assetId of ids) {
    const assetInfo = assetsInfo.get(assetId);
    assetInfo ? assetsInformation.push(assetInfo) : assetsNotFound.push(assetId);
  }

  if (assetsNotFound.length > 0) {
    const assetChunks = chunk(assetsNotFound, FETCH_ASSET_LIMIT);

    for (const assetChunk of assetChunks) {
      try {
        const fetched = await assetProvider.getAssets({ assetIds: assetChunk, extraData });
        fetchedAssets.push(...fetched);
      } catch (error) {
        // If an error occurs fetching from the provider then just skip this chunk
        logger.error('Error fetching assets info', { error: error.message });
      }
    }
    assetsInformation.push(...fetchedAssets);
  }
  return new Map(assetsInformation.filter((asset) => !!asset).map((asset) => [asset.assetId, asset]));
};
