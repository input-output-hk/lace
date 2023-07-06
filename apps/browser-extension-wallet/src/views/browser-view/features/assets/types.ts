import { Wallet } from '@lace/cardano';
import { AssetTableProps } from '@lace/core';

type Unpacked<T> = T extends (infer U)[] ? U : T;
export type IAssetDetails = Unpacked<AssetTableProps['rows']>;

export interface AssetSortBy {
  sortBy: {
    fiatBalance?: number;
    metadataName?: string;
    fingerprint: Wallet.Cardano.AssetFingerprint;
    amount?: string;
  };
}
