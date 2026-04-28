import { describe, expect, it } from 'vitest';

import {
  groupAddressesByAssetType,
  getTokenItemCount,
  getNftItemCount,
  isNftAsset,
  type GroupedAddressAssets,
} from '../src/common/utils';

import type { TokenTransferValue } from '../src/common/hooks';
import type { Cardano } from '@cardano-sdk/core';
import type { StoredTokenMetadata, TokenId } from '@lace-contract/tokens';

describe('group-addresses', () => {
  const createTokenTransferValue = (
    coins: bigint,
    assets: [Cardano.AssetId, bigint][] = [],
  ): TokenTransferValue => ({
    coins,
    assets: new Map(assets),
  });

  const policyId = 'a'.repeat(56);

  describe('isNftAsset', () => {
    it('should return true when metadata has isNft flag set to true', () => {
      const metadata: StoredTokenMetadata = {
        tokenId: 'test' as TokenId,
        decimals: 0,
        isNft: true,
        blockchainSpecific: {},
      };

      expect(isNftAsset(metadata)).toBe(true);
    });

    it('should return false when metadata has isNft flag set to false', () => {
      const metadata: StoredTokenMetadata = {
        tokenId: 'test' as TokenId,
        decimals: 0,
        isNft: false,
        blockchainSpecific: {},
      };

      expect(isNftAsset(metadata)).toBe(false);
    });

    it('should return false when metadata has no isNft flag', () => {
      const metadata: StoredTokenMetadata = {
        tokenId: 'test' as TokenId,
        decimals: 0,
        blockchainSpecific: {},
      };

      expect(isNftAsset(metadata)).toBe(false);
    });

    it('should return false when metadata is undefined', () => {
      expect(isNftAsset(undefined)).toBe(false);
    });
  });

  describe('groupAddressesByAssetType', () => {
    it('should group addresses with only coins', () => {
      const address1 = 'addr1_test_address1' as Cardano.PaymentAddress;
      const addresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [address1, createTokenTransferValue(BigInt(5000000))],
      ]);

      const result = groupAddressesByAssetType(addresses);

      expect(result.size).toBe(1);
      const group = result.get(address1);
      expect(group?.coins).toEqual([BigInt(5000000)]);
      expect(group?.tokens).toEqual([]);
      expect(group?.nfts).toEqual([]);
    });

    it('should group addresses with coins and fungible tokens', () => {
      const address1 = 'addr1_test_address1' as Cardano.PaymentAddress;
      const assetId = `${policyId}546f6b656e` as Cardano.AssetId;
      const addresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          address1,
          createTokenTransferValue(BigInt(5000000), [[assetId, BigInt(100)]]),
        ],
      ]);

      const result = groupAddressesByAssetType(addresses);

      expect(result.size).toBe(1);
      const group = result.get(address1);
      expect(group?.coins).toEqual([BigInt(5000000)]);
      expect(group?.tokens.length).toBe(1);
      expect(group?.tokens[0].assetId).toBe(assetId);
      expect(group?.tokens[0].amount).toBe(BigInt(100));
      expect(group?.nfts).toEqual([]);
    });

    it('should separate NFTs from tokens based on metadata', () => {
      const address1 = 'addr1_test_address1' as Cardano.PaymentAddress;
      const tokenAssetId = `${policyId}546f6b656e` as Cardano.AssetId;
      const nftAssetId = `${policyId}4e4654` as Cardano.AssetId;

      const addresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          address1,
          createTokenTransferValue(BigInt(5000000), [
            [tokenAssetId, BigInt(100)],
            [nftAssetId, BigInt(1)],
          ]),
        ],
      ]);

      const tokensMetadata: Partial<Record<TokenId, StoredTokenMetadata>> = {
        [`${policyId}.546f6b656e` as TokenId]: {
          tokenId: `${policyId}.546f6b656e` as TokenId,
          name: 'Test Token',
          decimals: 0,
          isNft: false,
          blockchainSpecific: {},
        },
        [`${policyId}.4e4654` as TokenId]: {
          tokenId: `${policyId}.4e4654` as TokenId,
          name: 'Test NFT',
          decimals: 0,
          isNft: true,
          blockchainSpecific: {},
        },
      };

      const result = groupAddressesByAssetType(addresses, tokensMetadata);

      expect(result.size).toBe(1);
      const group = result.get(address1);
      expect(group?.coins).toEqual([BigInt(5000000)]);
      expect(group?.tokens.length).toBe(1);
      expect(group?.tokens[0].assetId).toBe(tokenAssetId);
      expect(group?.nfts.length).toBe(1);
      expect(group?.nfts[0].assetId).toBe(nftAssetId);
    });

    it('should handle multiple addresses', () => {
      const address1 = 'addr1_test_address1' as Cardano.PaymentAddress;
      const address2 = 'addr1_test_address2' as Cardano.PaymentAddress;

      const addresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [address1, createTokenTransferValue(BigInt(5000000))],
        [address2, createTokenTransferValue(BigInt(3000000))],
      ]);

      const result = groupAddressesByAssetType(addresses);

      expect(result.size).toBe(2);
      expect(result.get(address1)?.coins).toEqual([BigInt(5000000)]);
      expect(result.get(address2)?.coins).toEqual([BigInt(3000000)]);
    });

    it('should filter out addresses with no value', () => {
      const address1 = 'addr1_test_address1' as Cardano.PaymentAddress;
      const address2 = 'addr1_test_address2' as Cardano.PaymentAddress;

      const addresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [address1, createTokenTransferValue(BigInt(5000000))],
        [address2, createTokenTransferValue(BigInt(0))],
      ]);

      const result = groupAddressesByAssetType(addresses);

      expect(result.size).toBe(1);
      expect(result.has(address1)).toBe(true);
      expect(result.has(address2)).toBe(false);
    });

    it('should return empty map for empty addresses', () => {
      const addresses = new Map<Cardano.PaymentAddress, TokenTransferValue>();

      const result = groupAddressesByAssetType(addresses);

      expect(result.size).toBe(0);
    });

    it('should include metadata in the grouped assets', () => {
      const address1 = 'addr1_test_address1' as Cardano.PaymentAddress;
      const assetId = `${policyId}546f6b656e` as Cardano.AssetId;

      const addresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          address1,
          createTokenTransferValue(BigInt(0), [[assetId, BigInt(100)]]),
        ],
      ]);

      const tokensMetadata: Partial<Record<TokenId, StoredTokenMetadata>> = {
        [`${policyId}.546f6b656e` as TokenId]: {
          tokenId: `${policyId}.546f6b656e` as TokenId,
          name: 'Test Token',
          ticker: 'TEST',
          decimals: 6,
          isNft: false,
          blockchainSpecific: {},
        },
      };

      const result = groupAddressesByAssetType(addresses, tokensMetadata);

      const group = result.get(address1);
      expect(group?.tokens[0].metadata?.name).toBe('Test Token');
      expect(group?.tokens[0].metadata?.ticker).toBe('TEST');
      expect(group?.tokens[0].metadata?.decimals).toBe(6);
    });

    it('should handle assets without metadata', () => {
      const address1 = 'addr1_test_address1' as Cardano.PaymentAddress;
      const assetId = `${policyId}546f6b656e` as Cardano.AssetId;

      const addresses = new Map<Cardano.PaymentAddress, TokenTransferValue>([
        [
          address1,
          createTokenTransferValue(BigInt(0), [[assetId, BigInt(100)]]),
        ],
      ]);

      const result = groupAddressesByAssetType(addresses, undefined);

      const group = result.get(address1);
      expect(group?.tokens.length).toBe(1);
      expect(group?.tokens[0].metadata).toBeUndefined();
    });
  });

  describe('getTokenItemCount', () => {
    it('should return 1 for coins only', () => {
      const group: GroupedAddressAssets = {
        coins: [BigInt(5000000)],
        tokens: [],
        nfts: [],
      };

      expect(getTokenItemCount(group)).toBe(1);
    });

    it('should return tokens count only when no coins', () => {
      const group: GroupedAddressAssets = {
        coins: [],
        tokens: [
          { assetId: 'asset1' as Cardano.AssetId, amount: BigInt(100) },
          { assetId: 'asset2' as Cardano.AssetId, amount: BigInt(200) },
        ],
        nfts: [],
      };

      expect(getTokenItemCount(group)).toBe(2);
    });

    it('should return tokens count plus 1 when coins present', () => {
      const group: GroupedAddressAssets = {
        coins: [BigInt(5000000)],
        tokens: [
          { assetId: 'asset1' as Cardano.AssetId, amount: BigInt(100) },
          { assetId: 'asset2' as Cardano.AssetId, amount: BigInt(200) },
        ],
        nfts: [],
      };

      expect(getTokenItemCount(group)).toBe(3);
    });

    it('should return 0 when no coins and no tokens', () => {
      const group: GroupedAddressAssets = {
        coins: [],
        tokens: [],
        nfts: [{ assetId: 'nft1' as Cardano.AssetId, amount: BigInt(1) }],
      };

      expect(getTokenItemCount(group)).toBe(0);
    });
  });

  describe('getNftItemCount', () => {
    it('should return 0 for no NFTs', () => {
      const group: GroupedAddressAssets = {
        coins: [BigInt(5000000)],
        tokens: [],
        nfts: [],
      };

      expect(getNftItemCount(group)).toBe(0);
    });

    it('should return correct count for NFTs', () => {
      const group: GroupedAddressAssets = {
        coins: [],
        tokens: [],
        nfts: [
          { assetId: 'nft1' as Cardano.AssetId, amount: BigInt(1) },
          { assetId: 'nft2' as Cardano.AssetId, amount: BigInt(1) },
          { assetId: 'nft3' as Cardano.AssetId, amount: BigInt(1) },
        ],
      };

      expect(getNftItemCount(group)).toBe(3);
    });
  });
});
