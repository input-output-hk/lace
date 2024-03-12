/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers, unicorn/no-useless-undefined */
import '@testing-library/jest-dom';
import { GetTokenListParams, getTokenList } from '../get-token-list';
import { mockAsset, mockNft } from '../mocks/test-helpers';
import { defaultCurrency } from '@providers/currency/constants';
import { Wallet } from '@lace/cardano';
import { Asset } from '@cardano-sdk/core';
import { PriceResult } from '@hooks';

const testEnvironment = 'Preprod';

describe('getTokensList', () => {
  const payload = {
    assetsInfo: new Map([
      [mockAsset.assetId, mockAsset],
      [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c40'), mockAsset],
      [mockNft.assetId, mockNft],
      [
        Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c42'),
        {
          ...mockNft,
          nftMetadata: undefined
        }
      ],
      [
        Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c43'),
        {
          ...mockNft,
          nftMetadata: { name: undefined, image: undefined } as Asset.NftMetadata
        }
      ]
    ]),
    balance: new Map([
      [mockAsset.assetId, BigInt(20)],
      [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c40'), BigInt(20)],
      [mockNft.assetId, BigInt(1)],
      [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c42'), BigInt(1)],
      [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c43'), BigInt(1)]
    ]),
    fiatCurrency: defaultCurrency,
    environmentName: testEnvironment,
    tokensSpent: { [mockAsset.assetId]: '1' },
    prices: {
      cardano: {
        price: 2,
        priceVariationPercentage24h: 0.2
      },
      tokens: new Map([
        [
          Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c40'),
          {
            id: 'id',
            priceInAda: 22,
            priceVariationPercentage24h: 0.3
          }
        ]
      ])
    }
  } as GetTokenListParams;
  test('should return a list with all nfts and another with all non-nft assets', () => {
    const { nftList, tokenList } = getTokenList(payload);

    expect(nftList).toHaveLength(3);
    expect(nftList[0].assetId).toEqual(mockNft.assetId);

    expect(tokenList).toHaveLength(2);
    expect(tokenList[0].assetId).toEqual(mockAsset.assetId);
    expect(tokenList[1].fiat).toEqual('880.000 USD');

    expect(nftList[1].name).toEqual(`SingleNFT${testEnvironment}`);
    expect(nftList[2].name).toEqual(`SingleNFT${testEnvironment}`);
    expect(nftList[1].image).toEqual(undefined);
    expect(nftList[2].image).toEqual(undefined);
  });

  test('should return proper asset name in case environment name is missing', () => {
    expect(getTokenList({ ...payload, environmentName: undefined }).nftList[1].name).toEqual('SingleNFT');
  });

  test('should return proper fiat value in case prices are missing', () => {
    expect(getTokenList({ ...payload, prices: undefined }).tokenList[0].fiat).toEqual('-');
  });

  test('should return proper fiat value in case token is missing from tokens map', () => {
    expect(getTokenList({ ...payload, prices: { tokens: new Map() } as PriceResult }).tokenList[0].fiat).toEqual('-');
  });

  test('should return proper fiat value in case token data is missing from tokens map', () => {
    expect(
      getTokenList({ ...payload, prices: { tokens: new Map([[mockAsset.assetId, {}]]) } as PriceResult }).tokenList[0]
        .fiat
    ).toEqual('-');
  });

  test('should return proper fiat value in case assetsInfo is empty', () => {
    expect(getTokenList({ ...payload, assetsInfo: new Map() }).tokenList[0].fiat).toEqual('-');
  });

  test('should return proper fiat value in case token data is missing in assetsInfo', () => {
    expect(
      getTokenList({
        ...payload,
        assetsInfo: new Map([[mockAsset.assetId, undefined]]) as Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>
      }).tokenList[0].fiat
    ).toEqual('-');
  });

  test('should return proper fiat value in case token prices map is missing', () => {
    expect(
      getTokenList({ ...payload, prices: { cardano: {} as PriceResult['cardano'] } as PriceResult }).tokenList[0].fiat
    ).toEqual('-');
  });

  test('should return proper fiat value in case cardano value is missing', () => {
    expect(
      getTokenList({
        ...payload,
        prices: { cardano: {} as PriceResult['cardano'], tokens: payload.prices.tokens } as PriceResult
      }).tokenList[0].fiat
    ).toEqual('-');
  });

  test('should return empty arrays when there is no balance', async () => {
    const emptyMap = getTokenList({
      assetsInfo: new Map([
        [mockAsset.assetId, mockAsset],
        [mockNft.assetId, mockNft]
      ]),
      balance: new Map(),
      environmentName: testEnvironment,
      fiatCurrency: defaultCurrency
    });
    const undefinedBalance = getTokenList({
      assetsInfo: new Map([
        [mockAsset.assetId, mockAsset],
        [mockNft.assetId, mockNft]
      ]),
      balance: undefined,
      environmentName: testEnvironment,
      fiatCurrency: defaultCurrency
    });

    expect(emptyMap.nftList).toHaveLength(0);
    expect(emptyMap.tokenList).toHaveLength(0);
    expect(undefinedBalance.nftList).toHaveLength(0);
    expect(undefinedBalance.tokenList).toHaveLength(0);
  });

  test('should return as all assets as tokens with no metadata when there is no asset info', async () => {
    const emptyMap = getTokenList({
      assetsInfo: new Map(),
      balance: new Map([
        [mockAsset.assetId, BigInt(20)],
        [mockNft.assetId, BigInt(1)]
      ]),
      environmentName: testEnvironment,
      fiatCurrency: defaultCurrency
    });

    const undefinedInfo = getTokenList({
      assetsInfo: undefined,
      balance: new Map([
        [mockAsset.assetId, BigInt(20)],
        [mockNft.assetId, BigInt(1)]
      ]),
      environmentName: testEnvironment,
      fiatCurrency: defaultCurrency
    });

    expect(emptyMap.nftList).toHaveLength(0);
    expect(emptyMap.tokenList).toHaveLength(2);
    expect(undefinedInfo.nftList).toHaveLength(0);
    expect(undefinedInfo.tokenList).toHaveLength(2);
  });

  test('should return no info for assets that are not in the balance', async () => {
    const { nftList, tokenList } = getTokenList({
      assetsInfo: new Map([
        [mockAsset.assetId, mockAsset],
        [mockNft.assetId, mockNft]
      ]),
      balance: new Map([[mockAsset.assetId, BigInt(20)]]),
      environmentName: testEnvironment,
      fiatCurrency: defaultCurrency
    });

    expect(nftList).toHaveLength(0);
    expect(tokenList).toHaveLength(1);
    expect(tokenList[0].assetId).toEqual(mockAsset.assetId);
  });
});
