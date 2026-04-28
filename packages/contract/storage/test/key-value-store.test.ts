import { createTestScheduler } from '@cardano-sdk/util-dev';
import { from } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KeyValueStore } from '../src';

import {
  MOCK_STORAGE_SAVE_ERROR,
  mockEmptyStorage,
  mockFailedStorage,
  mockStorageApi,
  mockStoredDataOnce,
  mockSuccessfulStorage,
} from './helpers';

import type { StorageAdapter } from '../src';

describe('storage:key-value-store', () => {
  const storedNamespace = 'test-namespace';
  let store: KeyValueStore<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new KeyValueStore(
      storedNamespace,
      mockStorageApi as StorageAdapter<string>,
      dummyLogger,
    );
  });

  describe('#getValues()', () => {
    it('returns empty observable when no values have been set yet', () => {
      mockEmptyStorage();
      createTestScheduler().run(({ expectObservable }): void => {
        const key = 'bla';
        expectObservable(store.getValues([key])).toBe('|');
        expect(mockStorageApi.getItem).toHaveBeenCalledWith(
          store.getNamespacedKey(key),
        );
      });
    });

    it('returns values array for requested keys', () => {
      mockStoredDataOnce('first');
      mockStoredDataOnce('third');
      createTestScheduler().run(({ expectObservable, flush }): void => {
        expectObservable(store.getValues(['first', 'third'])).toBe('(a|)', {
          a: ['first', 'third'],
        });
        flush();
        expect(mockStorageApi.getItem).toHaveBeenCalledWith(
          store.getNamespacedKey('first'),
        );
        expect(mockStorageApi.getItem).toHaveBeenCalledWith(
          store.getNamespacedKey('third'),
        );
      });
    });
  });

  describe('#setValue()', () => {
    it('sets value and emits undefined on success', () => {
      mockEmptyStorage();
      mockSuccessfulStorage();
      const key = 'an';
      createTestScheduler().run(({ expectObservable }): void => {
        expectObservable(store.setValue(key, 'example')).toBe('(a|)', {
          a: undefined,
        });
        expect(mockStorageApi.setItem).toHaveBeenCalledWith(
          store.getNamespacedKey(key),
          'example',
        );
      });
    });

    it('removes value in existing collection and emits undefined on success', () => {
      const key = 'keyToRemove';
      mockStorageApi.removeItem.mockReturnValue(from([undefined]));
      createTestScheduler().run(({ expectObservable, flush }): void => {
        expectObservable(store.setValue(key, undefined)).toBe('(a|)', {
          a: undefined,
        });
        flush();
        expect(mockStorageApi.removeItem).toHaveBeenCalledWith(
          store.getNamespacedKey(key),
        );
      });
    });

    it('errors when storage fails', () => {
      mockEmptyStorage();
      mockFailedStorage();
      createTestScheduler().run(({ expectObservable }): void => {
        expectObservable(store.setValue('test', 'example')).toBe(
          '#',
          null,
          MOCK_STORAGE_SAVE_ERROR,
        );
      });
    });
  });
});
