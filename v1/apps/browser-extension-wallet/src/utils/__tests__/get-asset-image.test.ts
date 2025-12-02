import { AssetOrHandleInfo } from '@hooks';
import { getAssetImage } from '../get-asset-image';
import { Wallet } from '@lace/cardano';
import { HandleInfo } from '@cardano-sdk/wallet';

describe('Testing getAssetImage function', () => {
  test('should return the handle image if available', () => {
    const asset: Partial<HandleInfo> = {
      image: Wallet.Asset.Uri('ipfs://image1')
    };

    const result = getAssetImage(asset as HandleInfo);

    expect(result).toBe(asset.image);
  });

  test('should return the NFT metadata image if asset image is not available', () => {
    const asset: Partial<Wallet.Asset.AssetInfo> = {
      nftMetadata: {
        image: Wallet.Asset.Uri('ipfs://image1'),
        name: 'NFT',
        version: '1.0'
      }
    };

    const result = getAssetImage(asset as Wallet.Asset.AssetInfo);

    expect(result).toBe(asset.nftMetadata.image);
  });

  test('should return undefined if both handle image and NFT metadata image are not available', () => {
    const asset = {} as AssetOrHandleInfo;

    const result = getAssetImage(asset);

    expect(result).toBeUndefined();
  });
});
