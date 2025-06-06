import { Wallet } from '@lace/cardano';

export const isNFT = (assetInfo: Wallet.Asset.AssetInfo): boolean => assetInfo?.supply === BigInt(1);
export const mayBeNFT = (assetInfo: Wallet.Asset.AssetInfo): boolean => !assetInfo || assetInfo.supply === BigInt(1);
