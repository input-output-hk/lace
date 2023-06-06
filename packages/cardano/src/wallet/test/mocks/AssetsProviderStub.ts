/* eslint-disable @typescript-eslint/no-unused-vars */
import { Cardano, AssetProvider, Asset } from '@cardano-sdk/core';

export const mockedAssets: Asset.AssetInfo[] = [
  {
    mintOrBurnCount: 0,
    assetId: Cardano.AssetId('b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e'),
    fingerprint: Cardano.AssetFingerprint('asset1pkpwyknlvul7az0xx8czhl60pyel45rpje4z8w'),
    history: [
      {
        quantity: BigInt('13000'),
        transactionId: Cardano.TransactionId('4123d70f66414cc921f6ffc29a899aafc7137a99a0fd453d6b200863ef5702d6')
      },
      {
        quantity: BigInt('-1000'),
        transactionId: Cardano.TransactionId('6804edf9712d2b619edb6ac86861fe93a730693183a262b165fcc1ba1bc99cad')
      }
    ],
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
  getAsset: jest.fn().mockImplementation(
    ({ assetId }) =>
      // eslint-disable-next-line promise/avoid-new
      new Promise((resolve) => resolve(assets.find((asset) => asset.assetId === assetId) || assets[0]))
  ),
  getAssets: jest.fn().mockImplementation(
    ({ assetIds }) =>
      // eslint-disable-next-line promise/avoid-new
      new Promise((resolve) => resolve(assets.find((asset) => assetIds.includes(asset.assetId)) || assets[0]))
  ),
  healthCheck: jest.fn().mockResolvedValue({ ok: true })
});
