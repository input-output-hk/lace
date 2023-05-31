import { Wallet } from '@lace/cardano';

export const isNFT = (assetInfo: Wallet.Asset.AssetInfo): boolean => assetInfo?.supply === BigInt(1);
