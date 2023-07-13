import { AssetOrHandleInfo } from '@hooks';
import { Wallet } from '@lace/cardano';

export const getAssetImage = (asset: AssetOrHandleInfo): Wallet.Asset.Uri =>
  'image' in asset ? asset.image : asset.nftMetadata?.image;
