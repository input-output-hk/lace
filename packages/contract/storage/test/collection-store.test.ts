import { createTestScheduler } from '@cardano-sdk/util-dev';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectionStore } from '../src';

import {
  MOCK_STORAGE_SAVE_ERROR,
  mockEmptyStorage,
  mockFailedStorage,
  mockStorageApi,
  mockStoredData,
  mockSuccessfulStorage,
} from './helpers';

describe('storage:collection-store', () => {
  const storedCollectionName = 'test';
  const storedCollection = ['first', 'second', 'third'];
  let store: CollectionStore<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new CollectionStore(
      storedCollectionName,
      mockStorageApi,
      dummyLogger,
    );
  });

  describe('#getAll()', () => {
    it('completes without emitting if collection is empty', () => {
      mockEmptyStorage();
      createTestScheduler().run(({ expectObservable }): void => {
        expectObservable(store.getAll()).toBe('|');
        expect(mockStorageApi.getItem).toHaveBeenCalledWith(
          storedCollectionName,
        );
      });
    });
    it('emits the stored collection and completes', () => {
      mockStoredData(storedCollection);
      createTestScheduler().run(({ expectObservable }): void => {
        expectObservable(store.getAll()).toBe('(a|)', { a: storedCollection });
        expect(mockStorageApi.getItem).toHaveBeenCalledWith(
          storedCollectionName,
        );
      });
    });
  });

  describe('#setAll()', () => {
    it('emits undefined and completes on success', () => {
      mockEmptyStorage();
      mockSuccessfulStorage();
      createTestScheduler().run(({ expectObservable }): void => {
        expectObservable(store.setAll(storedCollection)).toBe('(a|)', {
          a: undefined,
        });
        expect(mockStorageApi.setItem).toHaveBeenCalledWith(
          storedCollectionName,
          storedCollection,
        );
      });
    });
  });

  describe('#observeAll()', () => {
    it('emits empty array if no documents are stored', () => {
      mockEmptyStorage();
      createTestScheduler().run(({ expectObservable }): void => {
        expectObservable(store.observeAll()).toBe('a', { a: [] });
        expect(mockStorageApi.getItem).toHaveBeenCalledWith(
          storedCollectionName,
        );
      });
    });

    it('emits whenever new value is set', () => {
      mockEmptyStorage();
      mockSuccessfulStorage();
      createTestScheduler().run(({ expectObservable }): void => {
        expectObservable(store.observeAll()).toBe('(ab)', {
          a: [],
          b: storedCollection,
        });
        expectObservable(store.setAll(storedCollection)).toBe('(a|)', {
          a: undefined,
        });
      });
    });

    it('errors when storage fails', () => {
      mockEmptyStorage();
      mockFailedStorage();
      createTestScheduler().run(({ expectObservable }): void => {
        expectObservable(store.observeAll()).toBe('a', { a: [] });
        expectObservable(store.setAll(storedCollection)).toBe(
          '#',
          null,
          MOCK_STORAGE_SAVE_ERROR,
        );
      });
    });
  });
});
