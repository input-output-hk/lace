import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storageApi } from '../src/storage-api-adapter';

afterEach(() => vi.unstubAllGlobals());

describe('storage-web-indexeddb:storage-api-adapter', () => {
  describe('getItem', () => {
    it('returns null when the item does not exist', async () => {
      await expect(storageApi.getItem('missing')).resolves.toBeNull();
    });

    it('rejects when the storage fails', async () => {
      vi.resetModules();
      vi.stubGlobal('indexedDB', {
        open: () => {
          throw new Error('storage failure');
        },
      });
      const { storageApi: brokenStorageApi } = await import(
        '../src/storage-api-adapter'
      );
      await expect(brokenStorageApi.getItem('key')).rejects.toThrow(
        'storage failure',
      );
    });

    it('reopens the database after a failed open', async () => {
      vi.resetModules();
      const realIndexedDB = globalThis.indexedDB;
      let attempts = 0;
      vi.stubGlobal('indexedDB', {
        open: (...args: Parameters<IDBFactory['open']>) => {
          attempts += 1;
          if (attempts === 1) throw new Error('storage failure');
          return realIndexedDB.open(...args);
        },
      });
      const { storageApi: recoveringStorageApi } = await import(
        '../src/storage-api-adapter'
      );

      await expect(recoveringStorageApi.getItem('key')).rejects.toThrow(
        'storage failure',
      );

      await expect(recoveringStorageApi.getItem('key')).resolves.toBeNull();
      expect(attempts).toBe(2);
    });
  });

  describe('setItem', () => {
    it('round-trips string values', async () => {
      await storageApi.setItem('string-key', 'value');
      await expect(storageApi.getItem('string-key')).resolves.toBe('value');
    });

    it('round-trips non-string values', async () => {
      const value = {
        amount: 123_456_789_012_345_678_901_234_567_890n,
        assets: new Map([['asset-id', 42n]]),
        nested: { list: [1, 2, 3], isEnabled: true },
      };
      await storageApi.setItem('object-key', value);
      await expect(storageApi.getItem('object-key')).resolves.toEqual(value);
    });

    it('overwrites the previously stored value', async () => {
      await storageApi.setItem('overwrite-key', 'initial');
      await storageApi.setItem('overwrite-key', 'updated');
      await expect(storageApi.getItem('overwrite-key')).resolves.toBe(
        'updated',
      );
    });

    it('rejects when the storage fails', async () => {
      vi.resetModules();
      vi.stubGlobal('indexedDB', {
        open: () => {
          throw new Error('storage failure');
        },
      });
      const { storageApi: brokenStorageApi } = await import(
        '../src/storage-api-adapter'
      );
      await expect(brokenStorageApi.setItem('key', 'value')).rejects.toThrow(
        'storage failure',
      );
    });
  });

  describe('removeItem', () => {
    it('removes the stored item', async () => {
      await storageApi.setItem('remove-key', 'value');
      await storageApi.removeItem('remove-key');
      await expect(storageApi.getItem('remove-key')).resolves.toBeNull();
    });

    it('resolves when the item does not exist', async () => {
      await expect(
        storageApi.removeItem('never-stored'),
      ).resolves.toBeUndefined();
    });
  });
});
