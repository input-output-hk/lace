import { describe, expect, it } from 'vitest';

import { formatMetadataForDisplay, jsonReplacer } from '../src/common/utils';

import type { Cardano } from '@cardano-sdk/core';

describe('metadata-utils', () => {
  describe('jsonReplacer', () => {
    it('converts BigInt to string', () => {
      const result = jsonReplacer(
        'key',
        BigInt(123456789012345678901234567890n),
      );
      expect(result).toBe('123456789012345678901234567890');
    });

    it('converts Uint8Array to regular array', () => {
      const uint8Array = new Uint8Array([1, 2, 3, 4, 5]);
      const result = jsonReplacer('key', uint8Array);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('returns strings unchanged', () => {
      const result = jsonReplacer('key', 'hello world');
      expect(result).toBe('hello world');
    });

    it('returns numbers unchanged', () => {
      const result = jsonReplacer('key', 42);
      expect(result).toBe(42);
    });

    it('returns booleans unchanged', () => {
      expect(jsonReplacer('key', true)).toBe(true);
      expect(jsonReplacer('key', false)).toBe(false);
    });

    it('returns null unchanged', () => {
      const result = jsonReplacer('key', null);
      expect(result).toBe(null);
    });

    it('returns objects unchanged', () => {
      const object = { a: 1, b: 2 };
      const result = jsonReplacer('key', object);
      expect(result).toEqual(object);
    });

    it('returns arrays unchanged', () => {
      const array = [1, 2, 3];
      const result = jsonReplacer('key', array);
      expect(result).toEqual(array);
    });
  });

  describe('formatMetadataForDisplay', () => {
    it('returns null when auxiliaryData has no blob', () => {
      const auxiliaryData = {} as Cardano.AuxiliaryData;
      const result = formatMetadataForDisplay(auxiliaryData);
      expect(result).toBeNull();
    });

    it('formats metadata blob with simple string values', () => {
      const blob = new Map<bigint, Cardano.Metadatum>();
      blob.set(BigInt(674), 'test message');

      const auxiliaryData = { blob } as Cardano.AuxiliaryData;
      const result = formatMetadataForDisplay(auxiliaryData);

      expect(result).not.toBeNull();
      const parsed = JSON.parse(result!) as Record<string, unknown>;
      expect(parsed['674']).toBe('test message');
    });

    it('formats metadata blob with BigInt values', () => {
      const blob = new Map<bigint, Cardano.Metadatum>();
      blob.set(BigInt(1), BigInt(9007199254740993n));

      const auxiliaryData = { blob } as Cardano.AuxiliaryData;
      const result = formatMetadataForDisplay(auxiliaryData);

      expect(result).not.toBeNull();
      expect(result).toContain('"9007199254740993"');
    });

    it('formats metadata blob with array values', () => {
      const blob = new Map<bigint, Cardano.Metadatum>();
      blob.set(BigInt(1), ['item1', 'item2', 'item3']);

      const auxiliaryData = { blob } as Cardano.AuxiliaryData;
      const result = formatMetadataForDisplay(auxiliaryData);

      expect(result).not.toBeNull();
      const parsed = JSON.parse(result!) as Record<string, unknown>;
      expect(parsed['1']).toEqual(['item1', 'item2', 'item3']);
    });

    it('formats metadata blob with nested Map structures', () => {
      const nestedMap = new Map<Cardano.Metadatum, Cardano.Metadatum>();
      nestedMap.set('name', 'Test NFT');
      nestedMap.set('description', 'A test NFT');

      const blob = new Map<bigint, Cardano.Metadatum>();
      blob.set(BigInt(721), nestedMap);

      const auxiliaryData = { blob } as Cardano.AuxiliaryData;
      const result = formatMetadataForDisplay(auxiliaryData);

      expect(result).not.toBeNull();
      const parsed = JSON.parse(result!) as Record<string, unknown>;
      expect(parsed['721']).toEqual({
        name: 'Test NFT',
        description: 'A test NFT',
      });
    });

    it('formats CIP-25 style NFT metadata', () => {
      const assetMap = new Map<Cardano.Metadatum, Cardano.Metadatum>();
      assetMap.set('name', 'My NFT');
      assetMap.set('image', 'ipfs://Qm...');
      assetMap.set('mediaType', 'image/png');

      const policyMap = new Map<Cardano.Metadatum, Cardano.Metadatum>();
      policyMap.set('MyAsset', assetMap);

      const rootMap = new Map<Cardano.Metadatum, Cardano.Metadatum>();
      rootMap.set('abc123', policyMap);

      const blob = new Map<bigint, Cardano.Metadatum>();
      blob.set(BigInt(721), rootMap);

      const auxiliaryData = { blob } as Cardano.AuxiliaryData;
      const result = formatMetadataForDisplay(auxiliaryData);

      expect(result).not.toBeNull();
      type CIP25Metadata = {
        '721': {
          abc123: {
            MyAsset: {
              name: string;
              image: string;
              mediaType: string;
            };
          };
        };
      };
      const parsed = JSON.parse(result!) as CIP25Metadata;
      expect(parsed['721']['abc123']['MyAsset']['name']).toBe('My NFT');
      expect(parsed['721']['abc123']['MyAsset']['image']).toBe('ipfs://Qm...');
    });

    it('formats with 2-space indentation', () => {
      const blob = new Map<bigint, Cardano.Metadatum>();
      blob.set(BigInt(1), 'test');

      const auxiliaryData = { blob } as Cardano.AuxiliaryData;
      const result = formatMetadataForDisplay(auxiliaryData);

      expect(result).not.toBeNull();
      expect(result).toContain('  ');
      expect(result?.split('\n').length).toBeGreaterThan(1);
    });

    it('handles empty blob Map', () => {
      const blob = new Map<bigint, Cardano.Metadatum>();

      const auxiliaryData = { blob } as Cardano.AuxiliaryData;
      const result = formatMetadataForDisplay(auxiliaryData);

      expect(result).not.toBeNull();
      const parsed = JSON.parse(result!) as Record<string, unknown>;
      expect(parsed).toEqual({});
    });

    it('handles mixed metadatum types in nested structure', () => {
      const mixedMap = new Map<Cardano.Metadatum, Cardano.Metadatum>();
      mixedMap.set('string', 'hello');
      mixedMap.set('bigint', BigInt(42));
      mixedMap.set('array', ['a', 'b', 'c']);

      const blob = new Map<bigint, Cardano.Metadatum>();
      blob.set(BigInt(100), mixedMap);

      const auxiliaryData = { blob } as Cardano.AuxiliaryData;
      const result = formatMetadataForDisplay(auxiliaryData);

      expect(result).not.toBeNull();
      type MixedMetadata = {
        '100': {
          string: string;
          bigint: string;
          array: string[];
        };
      };
      const parsed = JSON.parse(result!) as MixedMetadata;
      expect(parsed['100']['string']).toBe('hello');
      expect(parsed['100']['bigint']).toBe('42');
      expect(parsed['100']['array']).toEqual(['a', 'b', 'c']);
    });
  });
});
