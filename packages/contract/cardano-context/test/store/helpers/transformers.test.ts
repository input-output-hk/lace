import { Cardano } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { AccountId } from '@lace-contract/wallet-repo';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getFallbackAsset } from '../../../src/store/helpers/get-fallback-asset';
import { getAccountAddresses } from '../../../src/store/helpers/group-cardano-addresses-by-account';
import {
  calculateAssetBalance,
  extractAccountInfo,
  assetToCoinItemTransformer,
  transformTokenMap,
} from '../../../src/store/helpers/transformers';
import {
  CardanoPaymentAddress,
  CardanoRewardAccount,
} from '../../../src/types';
import { account0Context, chainId } from '../../mocks';

import type {
  CardanoTokenMetadata,
  CardanoAddressData,
} from '../../../src/types';
import type { Asset } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';
import type { TokenMetadata } from '@lace-contract/tokens';

vi.mock('../../../src/store/helpers/get-fallback-asset', () => ({
  getFallbackAsset: vi.fn(),
}));

vi.mock(
  '../../../src/store/helpers/group-cardano-addresses-by-account',
  () => ({
    getAccountAddresses: vi.fn(),
  }),
);

const mockGetAccountAddresses = vi.mocked(getAccountAddresses);
const mockGetFallbackAsset = vi.mocked(getFallbackAsset);

describe('transformers', () => {
  describe('extractAccountInfo', () => {
    const testAccountId = AccountId(account0Context.accountId);
    const testActivity: Required<Pick<Activity, 'accountId'>> = {
      accountId: testAccountId,
    };

    const testRewardAccount = CardanoRewardAccount(
      'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
    );

    const testPaymentAddress = CardanoPaymentAddress(
      'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
    );

    const createMockAddress = (
      rewardAccount?: CardanoRewardAccount,
    ): AnyAddress<CardanoAddressData> => ({
      accountId: testAccountId,
      address: testPaymentAddress,
      blockchainName: 'Cardano',
      ...(rewardAccount && {
        data: {
          accountIndex: 0,
          networkId: chainId.networkId,
          networkMagic: chainId.networkMagic,
          index: 0,
          type: AddressType.External,
          rewardAccount,
        },
      }),
    });

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return null when rewardAccount is undefined', () => {
      const addressesWithNoRewardAccount = [createMockAddress(undefined)];
      mockGetAccountAddresses.mockReturnValue(addressesWithNoRewardAccount);

      const result = extractAccountInfo({
        activity: testActivity,
        chainId,
        addresses: [],
      });

      expect(result).toBeNull();
    });

    it('should return AccountInfo object when rewardAccount is defined', () => {
      const addressesWithRewardAccount = [createMockAddress(testRewardAccount)];
      mockGetAccountAddresses.mockReturnValue(addressesWithRewardAccount);

      const result = extractAccountInfo({
        activity: testActivity,
        chainId,
        addresses: [],
      });

      expect(result).toEqual({
        rewardAccount: testRewardAccount,
        accountPaymentAddresses: [testPaymentAddress],
      });
    });
  });

  describe('calculateAssetBalance', () => {
    it('with decimals', () => {
      expect(
        calculateAssetBalance(BigInt(15), {
          decimals: 5,
          isNft: false,
        }),
      ).toEqual('0.00015');
    });

    it('balance with more digits than decimals digit', () => {
      expect(
        calculateAssetBalance(BigInt(15_000_000), {
          decimals: 5,
          isNft: false,
        }),
      ).toEqual('150');
    });

    it('with no decimals', () => {
      expect(calculateAssetBalance(BigInt(15), undefined)).toEqual('15');
      expect(
        calculateAssetBalance(BigInt(15), {
          decimals: 0,
          isNft: false,
        }),
      ).toEqual('15');
    });

    it('NFT with supply of 1 and decimals metadata - should ignore decimals', () => {
      expect(
        calculateAssetBalance(BigInt(1), { decimals: 5, isNft: true }),
      ).toEqual('1');
      expect(
        calculateAssetBalance(BigInt(15), { decimals: 5, isNft: true }),
      ).toEqual('15');
    });
  });

  describe('assetToCoinItemTransformer', () => {
    const testAssetId = Cardano.AssetId(
      '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    );
    const testBalance = BigInt(15000000);
    const testFingerprint = Cardano.AssetFingerprint(
      'asset1pkpwyknlvul7az0xx8czhl60pyel45rpje4z8w',
    );

    const createTokenMetadata = (
      overrides: Partial<TokenMetadata<CardanoTokenMetadata>> = {},
    ): TokenMetadata<CardanoTokenMetadata> => ({
      decimals: 5,
      isNft: false,
      name: 'Test Token',
      ticker: 'TEST',
      image: 'test-image.png',
      blockchainSpecific: {} as CardanoTokenMetadata,
      ...overrides,
    });

    const createAssetBalance = (): [Cardano.AssetId, bigint] => [
      testAssetId,
      testBalance,
    ];

    beforeEach(() => {
      vi.clearAllMocks();
      mockGetFallbackAsset.mockReturnValue({
        fingerprint: testFingerprint,
      } as Asset.AssetInfo);
    });

    it('should return correct coin item props', () => {
      const tokenMetadata = createTokenMetadata();
      const assetBalance = createAssetBalance();

      const result = assetToCoinItemTransformer(tokenMetadata, assetBalance);

      expect(result).toEqual({
        id: testAssetId.toString(),
        amount: calculateAssetBalance(testBalance, tokenMetadata),
        name: tokenMetadata.name,
        symbol: tokenMetadata.name,
        logo: tokenMetadata.image,
      });
    });

    it('should use name when provided, ticker as symbol when available', () => {
      const tokenMetadata = createTokenMetadata({
        name: 'Test Token',
        ticker: 'TEST',
      });
      const assetBalance = createAssetBalance();

      const result = assetToCoinItemTransformer(tokenMetadata, assetBalance);

      expect(result.name).toBe('Test Token');
      expect(result.symbol).toBe('Test Token');
    });

    it('should use ticker as symbol when name is undefined', () => {
      const tokenMetadata = createTokenMetadata({
        name: undefined,
        ticker: 'TEST',
      });
      const assetBalance = createAssetBalance();

      const result = assetToCoinItemTransformer(tokenMetadata, assetBalance);

      expect(result.name).toBe(testFingerprint);
      expect(result.symbol).toBe('TEST');
    });

    it('should use fingerprint as symbol when name and ticker are undefined', () => {
      const tokenMetadata = createTokenMetadata({
        name: undefined,
        ticker: undefined,
      });
      const assetBalance = createAssetBalance();

      const result = assetToCoinItemTransformer(tokenMetadata, assetBalance);

      expect(result.name).toBe(testFingerprint);
      expect(result.symbol).toBe(testFingerprint);
    });

    it('should set logo to image when provided, empty string when not', () => {
      const tokenMetadataWithImage = createTokenMetadata({
        image: 'test-image.png',
      });
      const tokenMetadataWithoutImage = createTokenMetadata({
        image: undefined,
      });
      const assetBalance = createAssetBalance();

      const resultWithImage = assetToCoinItemTransformer(
        tokenMetadataWithImage,
        assetBalance,
      );
      const resultWithoutImage = assetToCoinItemTransformer(
        tokenMetadataWithoutImage,
        assetBalance,
      );

      expect(resultWithImage.logo).toBe('test-image.png');
      expect(resultWithoutImage.logo).toBe('');
    });
  });

  describe('transformTokenMap', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    const testAssetId1 = Cardano.AssetId(
      '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    );
    const testAssetId2 = Cardano.AssetId(
      '2234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    );
    const testAssetId3 = Cardano.AssetId(
      '3234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    );
    const testBalance1 = BigInt(1000);
    const testBalance2 = BigInt(2000);
    const testBalance3 = BigInt(3000);

    const testTokenMetadata: TokenMetadata<CardanoTokenMetadata> = {
      decimals: 5,
      isNft: false,
      name: 'Test Token 1',
      ticker: 'TEST1',
      image: 'test-image-1.png',
      blockchainSpecific: {} as CardanoTokenMetadata,
    };

    const testTokenMap: Cardano.TokenMap = new Map([
      [testAssetId1, testBalance1],
      [testAssetId2, testBalance2],
      [testAssetId3, testBalance3],
    ]);

    const testAssetMetadataMap: Map<
      Cardano.AssetId,
      TokenMetadata<CardanoTokenMetadata>
    > = new Map([
      [testAssetId1, testTokenMetadata],
      [testAssetId2, testTokenMetadata],
    ]);

    it('should return empty array when tokenMap is empty', () => {
      const emptyTokenMap = new Map<Cardano.AssetId, bigint>();

      const result = transformTokenMap(emptyTokenMap, testAssetMetadataMap);

      expect(result).toEqual([]);
    });

    it('should return empty array when assetMetadataMap is empty', () => {
      const emptyAssetMetadataMap = new Map<
        Cardano.AssetId,
        TokenMetadata<CardanoTokenMetadata>
      >();

      const result = transformTokenMap(testTokenMap, emptyAssetMetadataMap);

      expect(result).toEqual([]);
    });

    it('should return tokens found in assetMetadataMap', () => {
      const result = transformTokenMap(testTokenMap, testAssetMetadataMap);
      expect(result).toHaveLength(2);
    });
  });
});
