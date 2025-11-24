import { Asset } from '@cardano-sdk/core';

export const isNFT = (assetInfo?: Asset.AssetInfo): boolean => assetInfo?.supply === BigInt(1);
export const mayBeNFT = (assetInfo?: Asset.AssetInfo): boolean => !assetInfo || assetInfo.supply === BigInt(1);
