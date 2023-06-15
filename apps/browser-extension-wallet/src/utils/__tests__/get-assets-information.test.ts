/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-shadow */
import '@testing-library/jest-dom';
import { Wallet } from '@lace/cardano';
import { getAssetsInformation, TokenInfo } from '../get-assets-information';
import { mockAssetMetadata } from '../mocks/test-helpers';
import { AssetProvider } from '@cardano-sdk/core';

describe('Testing getAssetsInformation function', () => {
  const assetsIdList: Wallet.Cardano.AssetId[] = [
    Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'),
    Wallet.Cardano.AssetId('b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e')
  ];
  const assetsInfo: TokenInfo = new Map([[assetsIdList[0], mockAssetMetadata]]);
  const assetProvider = Wallet.mockUtils.assetsProviderStub();

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    expect(assetProvider.getAssets).not.toHaveBeenCalled();
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
    expect(assetProvider.getAssets).toHaveBeenCalledWith({
      assetIds: [assetsIdList[1]],
      extraData: {
        nftMetadata: true,
        tokenMetadata: true
      }
    });
  });

  test('should skip an asset in case provider throws', async () => {
    const error = 'error';
    const assetProvider = {
      getAssets: jest.fn(() => {
        throw new Error(error);
      })
    } as unknown as AssetProvider;
    const assets = await getAssetsInformation([assetsIdList[1]], assetsInfo, {
      assetProvider,
      extraData: {
        nftMetadata: true,
        tokenMetadata: true
      }
    });

    expect(assets.size).toEqual(0);
    expect(assetProvider.getAssets).toHaveBeenCalled();
    expect(assetProvider.getAssets).not.toHaveReturned();
  });

  describe('chunks', () => {
    test('should call getAssets once if amount of assets is less than or equal 100', async () => {
      const hundredAssets = Array.from<Wallet.Cardano.AssetId>({ length: 100 }).fill(assetsIdList[1]);
      await getAssetsInformation(hundredAssets, assetsInfo, { assetProvider });
      expect(assetProvider.getAssets).toHaveBeenCalledTimes(1);
      expect(assetProvider.getAssets).toHaveBeenCalledWith({ assetIds: hundredAssets });
    });

    test('should call getAssets in chunks of 100 or less if the amount of assets is greater than 100', async () => {
      const lotsOfAssets = Array.from<Wallet.Cardano.AssetId>({ length: 250 }).fill(assetsIdList[1]);
      await getAssetsInformation(lotsOfAssets, assetsInfo, { assetProvider });
      expect(assetProvider.getAssets).toHaveBeenCalledTimes(3);
      expect(assetProvider.getAssets).toHaveBeenNthCalledWith(1, {
        assetIds: Array.from<Wallet.Cardano.AssetId>({ length: 100 }).fill(assetsIdList[1])
      });
      expect(assetProvider.getAssets).toHaveBeenNthCalledWith(2, {
        assetIds: Array.from<Wallet.Cardano.AssetId>({ length: 100 }).fill(assetsIdList[1])
      });
      expect(assetProvider.getAssets).toHaveBeenNthCalledWith(3, {
        assetIds: Array.from<Wallet.Cardano.AssetId>({ length: 50 }).fill(assetsIdList[1])
      });
    });
  });
});
