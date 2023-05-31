/* eslint-disable no-magic-numbers, unicorn/no-useless-undefined */
import '@testing-library/jest-dom';
import { getTokenList } from '../get-token-list';
import { mockAsset, mockNft } from '../mocks/test-helpers';
import { defaultCurrency } from '@providers/currency/constants';

const testEnvironment = 'Preprod';

describe('getTokensList', () => {
  test('should return a list with all nfts and another with all non-nft assets', async () => {
    const { nftList, tokenList } = getTokenList({
      assetsInfo: new Map([
        [mockAsset.assetId, mockAsset],
        [mockNft.assetId, mockNft]
      ]),
      balance: new Map([
        [mockAsset.assetId, BigInt(20)],
        [mockNft.assetId, BigInt(1)]
      ]),
      fiatCurrency: defaultCurrency,
      environmentName: testEnvironment
    });

    expect(nftList).toHaveLength(1);
    expect(nftList[0].assetId).toEqual(mockNft.assetId);

    expect(tokenList).toHaveLength(1);
    expect(tokenList[0].assetId).toEqual(mockAsset.assetId);
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
