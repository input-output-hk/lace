import { describe, expect, it } from 'vitest';

import {
  constructTokenId,
  decodeAssetName,
  extractAssetNameHex,
  extractPolicyId,
  formatAssetAmount,
  generateFallbackIconUrl,
  getAssetDisplayInfo,
  getTickerFallback,
  isAssetNft,
} from '../src/common/utils';

import type { Cardano } from '@cardano-sdk/core';
import type { StoredTokenMetadata, TokenId } from '@lace-contract/tokens';

describe('asset-utils', () => {
  describe('constructTokenId', () => {
    it('should construct TokenId from asset ID with policy ID and asset name', () => {
      const policyId = 'a'.repeat(56);
      const assetNameHex = '486f736b79';
      const assetId = `${policyId}${assetNameHex}` as Cardano.AssetId;

      const result = constructTokenId(assetId);

      expect(result).toBe(`${policyId}.${assetNameHex}`);
    });

    it('should handle asset ID with empty asset name', () => {
      const policyId = 'b'.repeat(56);
      const assetId = policyId as Cardano.AssetId;

      const result = constructTokenId(assetId);

      expect(result).toBe(`${policyId}.`);
    });

    it('should handle asset ID with long asset name', () => {
      const policyId = 'c'.repeat(56);
      const assetNameHex = 'd'.repeat(64);
      const assetId = `${policyId}${assetNameHex}` as Cardano.AssetId;

      const result = constructTokenId(assetId);

      expect(result).toBe(`${policyId}.${assetNameHex}`);
    });
  });

  describe('extractPolicyId', () => {
    it('should extract the first 56 characters as policy ID', () => {
      const policyId = 'e'.repeat(56);
      const assetId = `${policyId}assetname` as Cardano.AssetId;

      const result = extractPolicyId(assetId);

      expect(result).toBe(policyId);
    });
  });

  describe('extractAssetNameHex', () => {
    it('should extract characters after the policy ID as asset name hex', () => {
      const policyId = 'f'.repeat(56);
      const assetNameHex = '546f6b656e';
      const assetId = `${policyId}${assetNameHex}` as Cardano.AssetId;

      const result = extractAssetNameHex(assetId);

      expect(result).toBe(assetNameHex);
    });

    it('should return empty string for asset ID with no asset name', () => {
      const policyId = '0'.repeat(56);
      const assetId = policyId as Cardano.AssetId;

      const result = extractAssetNameHex(assetId);

      expect(result).toBe('');
    });
  });

  describe('decodeAssetName', () => {
    it('should decode valid UTF-8 hex string to readable text', () => {
      const hexName = '486f736b79';

      const result = decodeAssetName(hexName);

      expect(result).toBe('Hosky');
    });

    it('should decode multi-word UTF-8 hex string', () => {
      const hexName = '4d7920546f6b656e';

      const result = decodeAssetName(hexName);

      expect(result).toBe('My Token');
    });

    it('should return "Unknown" for empty hex name', () => {
      const result = decodeAssetName('');

      expect(result).toBe('Unknown');
    });

    it('should truncate non-printable hex strings', () => {
      const hexName = '8080808080808080808080';

      const result = decodeAssetName(hexName);

      expect(result).toBe('808080...808080');
    });

    it('should truncate very long hex strings that decode to non-printable characters', () => {
      const hexName = 'ff'.repeat(20);

      const result = decodeAssetName(hexName);

      expect(result).toBe('ffffff...ffffff');
    });
  });

  describe('getAssetDisplayInfo', () => {
    const policyId = '1'.repeat(56);
    const assetNameHex = '486f736b79';
    const assetId = `${policyId}${assetNameHex}` as Cardano.AssetId;

    it('should return metadata values when metadata is provided', () => {
      const metadata: StoredTokenMetadata = {
        tokenId: `${policyId}.${assetNameHex}` as TokenId,
        name: 'Hosky Token',
        ticker: 'HOSKY',
        image: 'https://example.com/hosky.png',
        decimals: 6,
        isNft: false,
        blockchainSpecific: {},
      };

      const result = getAssetDisplayInfo(assetId, metadata);

      expect(result).toEqual({
        name: 'Hosky Token',
        ticker: 'HOSKY',
        image: 'https://example.com/hosky.png',
        decimals: 6,
        isNft: false,
      });
    });

    it('should use decoded name when metadata name is missing', () => {
      const metadata: StoredTokenMetadata = {
        tokenId: `${policyId}.${assetNameHex}` as TokenId,
        decimals: 0,
        blockchainSpecific: {},
      };

      const result = getAssetDisplayInfo(assetId, metadata);

      expect(result.name).toBe('Hosky');
    });

    it('should generate ticker fallback when metadata ticker is missing', () => {
      const metadata: StoredTokenMetadata = {
        tokenId: `${policyId}.${assetNameHex}` as TokenId,
        name: 'LongTokenName',
        decimals: 0,
        blockchainSpecific: {},
      };

      const result = getAssetDisplayInfo(assetId, metadata);

      expect(result.ticker).toBe('Lo...me');
    });

    it('should return fallback values when no metadata is provided', () => {
      const result = getAssetDisplayInfo(assetId, undefined);

      expect(result.name).toBe('Hosky');
      expect(result.ticker).toBe('Hosky');
      expect(result.image).toBeUndefined();
      expect(result.decimals).toBe(0);
      expect(result.isNft).toBe(false);
    });

    it('should handle NFT metadata', () => {
      const metadata: StoredTokenMetadata = {
        tokenId: `${policyId}.${assetNameHex}` as TokenId,
        name: 'My NFT #123',
        decimals: 0,
        isNft: true,
        blockchainSpecific: {},
      };

      const result = getAssetDisplayInfo(assetId, metadata);

      expect(result.isNft).toBe(true);
    });
  });

  describe('getTickerFallback', () => {
    it('should return full name for short names', () => {
      expect(getTickerFallback('ABC')).toBe('ABC');
      expect(getTickerFallback('HOSKY')).toBe('HOSKY');
      expect(getTickerFallback('1234567')).toBe('1234567');
    });

    it('should truncate long names with ellipsis', () => {
      expect(getTickerFallback('LongTokenName')).toBe('Lo...me');
      expect(getTickerFallback('VeryLongAssetName')).toBe('Ve...me');
    });
  });

  describe('formatAssetAmount', () => {
    it('should format amount with 0 decimals', () => {
      expect(formatAssetAmount(BigInt(100), 0)).toBe('100');
      expect(formatAssetAmount(BigInt(1), 0)).toBe('1');
    });

    it('should format amount with 6 decimals', () => {
      expect(formatAssetAmount(BigInt(1000000), 6)).toBe('1');
      expect(formatAssetAmount(BigInt(1500000), 6)).toBe('1.5');
      expect(formatAssetAmount(BigInt(1234567), 6)).toBe('1.234567');
    });

    it('should format amount with trailing zeros removed', () => {
      expect(formatAssetAmount(BigInt(1000000), 6)).toBe('1');
      expect(formatAssetAmount(BigInt(1100000), 6)).toBe('1.1');
    });

    it('should handle large amounts', () => {
      expect(formatAssetAmount(BigInt(1234567890123), 6)).toBe(
        '1234567.890123',
      );
    });

    it('should handle zero amount', () => {
      expect(formatAssetAmount(BigInt(0), 0)).toBe('0');
      expect(formatAssetAmount(BigInt(0), 6)).toBe('0');
    });

    it('should handle amounts smaller than 1 with decimals', () => {
      expect(formatAssetAmount(BigInt(500000), 6)).toBe('0.5');
      expect(formatAssetAmount(BigInt(123), 6)).toBe('0.000123');
    });
  });

  describe('generateFallbackIconUrl', () => {
    it('should generate a data URL with SVG content', () => {
      const result = generateFallbackIconUrl('HOSKY');

      expect(result).toContain('data:image/svg+xml;utf8,');
      expect(result).toContain('HO');
    });

    it('should use uppercase initials', () => {
      const result = generateFallbackIconUrl('test');

      expect(result).toContain('TE');
    });

    it('should handle single character ticker', () => {
      const result = generateFallbackIconUrl('A');

      expect(result).toContain('A');
    });

    it('should use custom size', () => {
      const result = generateFallbackIconUrl('AB', 48);
      const decodedResult = decodeURIComponent(result);

      expect(decodedResult).toContain('width="48"');
      expect(decodedResult).toContain('height="48"');
    });
  });

  describe('isAssetNft', () => {
    it('should return true when metadata has isNft flag set to true', () => {
      const metadata: StoredTokenMetadata = {
        tokenId: 'test' as TokenId,
        decimals: 0,
        isNft: true,
        blockchainSpecific: {},
      };

      expect(isAssetNft(metadata)).toBe(true);
    });

    it('should return false when metadata has isNft flag set to false', () => {
      const metadata: StoredTokenMetadata = {
        tokenId: 'test' as TokenId,
        decimals: 0,
        isNft: false,
        blockchainSpecific: {},
      };

      expect(isAssetNft(metadata)).toBe(false);
    });

    it('should return false when metadata has no isNft flag', () => {
      const metadata: StoredTokenMetadata = {
        tokenId: 'test' as TokenId,
        decimals: 0,
        blockchainSpecific: {},
      };

      expect(isAssetNft(metadata)).toBe(false);
    });

    it('should return false when metadata is undefined', () => {
      expect(isAssetNft(undefined)).toBe(false);
    });
  });
});
