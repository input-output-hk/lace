/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable no-magic-numbers */
import { Asset } from '@cardano-sdk/core';
import { calculateAssetBalance, assetBalanceToBigInt } from '../asset-balance';

describe('asset-balance', () => {
  describe('calculateAssetBalance', () => {
    test('with decimals', () => {
      expect(calculateAssetBalance(BigInt(15), { tokenMetadata: { decimals: 5 } } as Asset.AssetInfo)).toEqual(
        '0.00015'
      );
    });

    test('balance with more digits than decimals digit', () => {
      expect(calculateAssetBalance(BigInt(15_000_000), { tokenMetadata: { decimals: 5 } } as Asset.AssetInfo)).toEqual(
        '150'
      );
    });

    test('with no decimals', () => {
      expect(calculateAssetBalance(BigInt(15), undefined)).toEqual('15');
      expect(calculateAssetBalance(BigInt(15), {} as Asset.AssetInfo)).toEqual('15');
      expect(calculateAssetBalance(BigInt(15), { tokenMetadata: undefined } as Asset.AssetInfo)).toEqual('15');
      expect(calculateAssetBalance(BigInt(15), { tokenMetadata: { decimals: undefined } } as Asset.AssetInfo)).toEqual(
        '15'
      );
      expect(calculateAssetBalance(BigInt(15), { tokenMetadata: { decimals: 0 } } as Asset.AssetInfo)).toEqual('15');
    });
  });

  describe('assetBalanceToBigInt', () => {
    test('with decimals', () => {
      expect(assetBalanceToBigInt('0.00015', { tokenMetadata: { decimals: 5 } } as Asset.AssetInfo)).toEqual(
        BigInt(15)
      );
    });

    test('balance with no decimals digits but with decimals in metadata', () => {
      expect(assetBalanceToBigInt('150', { tokenMetadata: { decimals: 5 } } as Asset.AssetInfo)).toEqual(
        BigInt(15_000_000)
      );
    });

    test('with no decimals in metadata', () => {
      expect(assetBalanceToBigInt('15', undefined)).toEqual(BigInt(15));
      expect(assetBalanceToBigInt('15', {} as Asset.AssetInfo)).toEqual(BigInt(15));
      expect(assetBalanceToBigInt('15', { tokenMetadata: undefined } as Asset.AssetInfo)).toEqual(BigInt(15));
      expect(assetBalanceToBigInt('15', { tokenMetadata: { decimals: undefined } } as Asset.AssetInfo)).toEqual(
        BigInt(15)
      );
      expect(assetBalanceToBigInt('15', { tokenMetadata: { decimals: 0 } } as Asset.AssetInfo)).toEqual(BigInt(15));
    });

    test('balance with max safe integer', () => {
      expect(assetBalanceToBigInt('9007199254740991', { tokenMetadata: { decimals: 0 } } as Asset.AssetInfo)).toEqual(
        BigInt(9_007_199_254_740_991)
      );
    });
    test('balance with number larger than max safe integer', () => {
      expect(assetBalanceToBigInt('9507199254740992', { tokenMetadata: { decimals: 0 } } as Asset.AssetInfo)).toEqual(
        BigInt(9_507_199_254_740_992)
      );
    });
  });
});
