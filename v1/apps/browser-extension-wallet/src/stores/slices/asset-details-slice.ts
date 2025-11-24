import { AssetDetailsSlice, BlockchainProviderSlice, SliceCreator, WalletInfoSlice, ZustandHandlers } from '../types';
import { Wallet } from '@lace/cardano';
import { firstValueFrom } from 'rxjs';
import { getAssetsInformation } from '@src/utils/get-assets-information';

const getAssets = async (
  assetIds: Wallet.Cardano.AssetId[],
  { get }: ZustandHandlers<AssetDetailsSlice & WalletInfoSlice & BlockchainProviderSlice>
) => {
  const wallet = get().inMemoryWallet;
  const walletAssets = await firstValueFrom(wallet.assetInfo$);
  return getAssetsInformation(assetIds, walletAssets, {
    assetProvider: get().blockchainProvider.assetProvider,
    extraData: {
      nftMetadata: true,
      tokenMetadata: true
    }
  });
};

/**
 * has all coin activities related actions and states
 */
export const assetDetailsSlice: SliceCreator<
  AssetDetailsSlice & WalletInfoSlice & BlockchainProviderSlice,
  AssetDetailsSlice
> = ({ set, get }) => ({
  setAssetDetails: (asset) => set({ assetDetails: asset }),
  getAssets: async (assetIds) => getAssets(assetIds, { set, get })
});
