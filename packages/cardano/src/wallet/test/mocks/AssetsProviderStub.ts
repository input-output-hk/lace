/* eslint-disable @typescript-eslint/no-unused-vars */
import { Cardano, AssetProvider, Asset } from '@cardano-sdk/core';

export const mockedAssets: Asset.AssetInfo[] = [
  {
    assetId: Cardano.AssetId('b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e'),
    fingerprint: Cardano.AssetFingerprint('asset1pkpwyknlvul7az0xx8czhl60pyel45rpje4z8w'),
    tokenMetadata: {
      assetId: Cardano.AssetId('b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e'),
      decimals: 6,
      desc: 'The Nut Coin',
      icon: 'iVBORw0KGgoAAAANSUhEUg',
      name: 'nutcoin',
      ticker: 'nutc',
      url: 'https://www.stakenuts.com/'
    },
    name: Cardano.AssetName('6e7574636f696e'),
    policyId: Cardano.PolicyId('b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a7'),
    quantity: BigInt('12000'),
    supply: BigInt('12000')
  }
];

export const assetsProviderStub = (assets: Asset.AssetInfo[] = mockedAssets): AssetProvider => ({
  getAsset: jest
    .fn()
    .mockImplementation(async ({ assetId }) => assets.find((asset) => asset.assetId === assetId) || assets[0]),
  getAssets: jest
    .fn()
    .mockImplementation(
      async ({ assetIds }) => assets.filter((asset) => assetIds.includes(asset.assetId)) || assets[0]
    ),
  healthCheck: jest.fn().mockResolvedValue({ ok: true })
});
