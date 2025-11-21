import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import { useWalletStore } from '@src/stores';
import { HandleInfo } from '@cardano-sdk/wallet';
import { useMemo } from 'react';

export type AssetOrHandleInfo = Wallet.Asset.AssetInfo | HandleInfo;
export type AssetOrHandleInfoMap = Map<Wallet.Cardano.AssetId, AssetOrHandleInfo>;

const withHandleInfo = (assets: Wallet.Assets, handles: HandleInfo[] = []): AssetOrHandleInfoMap => {
  const assetsWithHandleInfo = new Map(assets);
  handles.map((handle) => {
    if (assetsWithHandleInfo.has(handle.assetId)) {
      assetsWithHandleInfo.set(handle.assetId, handle);
    }
  });
  return assetsWithHandleInfo;
};

export const useAssetInfo = (): AssetOrHandleInfoMap => {
  const { inMemoryWallet } = useWalletStore();
  const handles = useObservable(inMemoryWallet.handles$);
  const assets = useObservable(inMemoryWallet.assetInfo$);
  return useMemo(() => withHandleInfo(assets, handles), [assets, handles]);
};
