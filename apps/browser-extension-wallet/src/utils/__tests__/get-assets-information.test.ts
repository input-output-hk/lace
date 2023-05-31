import '@testing-library/jest-dom';
import { Wallet } from '@lace/cardano';
import { getAssetsInformation, TokenInfo } from '../get-assets-information';
import { mockAssetMetadata } from '../mocks/test-helpers';

describe('Testing getAssetsInformation function', () => {
  const assetsIdList: Wallet.Cardano.AssetId[] = [
    Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'),
    Wallet.Cardano.AssetId('b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e')
  ];
  const assetsInfo: TokenInfo = new Map([[assetsIdList[0], mockAssetMetadata]]);
  const assetProvider = Wallet.mockUtils.assetsProviderStub();

  test('should get asset information by id when existing in assets info map', async () => {
    const assets = await getAssetsInformation([assetsIdList[0]], assetsInfo, {
      assetProvider,
      extraData: {
        nftMetadata: true,
        tokenMetadata: true
      }
    });

    expect(assets.size).toEqual(1);
    expect(assets.get(assetsIdList[0])).toEqual(mockAssetMetadata);
    expect(assetProvider.getAsset).not.toHaveBeenCalled();
  });

  test('should fetch asset information from provider when not existing in assets info map', async () => {
    const assets = await getAssetsInformation([assetsIdList[1]], assetsInfo, {
      assetProvider,
      extraData: {
        nftMetadata: true,
        tokenMetadata: true
      }
    });

    expect(assets.size).toEqual(1);
    expect(assets.get(assetsIdList[1])).toEqual(Wallet.mockUtils.mockedAssets[0]);
    expect(assetProvider.getAsset).toHaveBeenCalled();
  });
});
