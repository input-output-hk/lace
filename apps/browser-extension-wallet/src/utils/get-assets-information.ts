import { Wallet } from '@lace/cardano';

export type TokenInfo = Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>;
interface AssetExtraData {
  nftMetadata?: boolean;
  tokenMetadata?: boolean;
  history?: boolean;
}

export const getAssetsInformation = async (
  ids: Wallet.Cardano.AssetId[],
  assetsInfo: Wallet.Assets,
  { assetProvider, extraData }: { assetProvider: Wallet.AssetProvider; extraData?: AssetExtraData }
): Promise<TokenInfo> => {
  const assets = await Promise.all(
    ids.map(async (assetId) => {
      const asset = assetsInfo.get(assetId);
      try {
        if (!asset) return await assetProvider.getAsset({ assetId, extraData });
      } catch (error) {
        // If an error occurs fetching from the provider then just skip this asset
        console.log('Error fetching asset info', { assetId, error });
      }
      return asset;
    })
  );
  return new Map(assets.filter((asset) => !!asset).map((asset) => [asset.assetId, asset]));
};
