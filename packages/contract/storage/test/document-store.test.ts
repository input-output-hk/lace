import { createTestScheduler } from '@cardano-sdk/util-dev';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentStore } from '../src';

import {
  MOCK_STORAGE_SAVE_ERROR,
  mockEmptyStorage,
  mockFailedStorage,
  mockStorageApi,
  mockStoredData,
  mockSuccessfulStorage,
} from './helpers';

import type { StorageAdapter } from '../src';

type AnyDocument = { [key: string]: unknown };

describe('storage:document-store', () => {
  const docId = 'test';
  let store: DocumentStore<AnyDocument>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new DocumentStore(
      docId,
      mockStorageApi as StorageAdapter<AnyDocument>,
      dummyLogger,
    );
  });

  describe('#get()', () => {
    it('returns empty observable when no value has been set yet', () => {
      mockEmptyStorage();
      createTestScheduler().run(({ expectObservable }): void => {
        expectObservable(store.get()).toBe('|');
        expect(mockStorageApi.getItem).toHaveBeenCalledWith(docId);
      });
    });

    it('parses and returns stored json value', () => {
      const storedValue = { foo: 'bar' };
      mockStoredData(storedValue);
      createTestScheduler().run(({ expectObservable }): void => {
        expectObservable(store.get()).toBe('(a|)', {
          a: storedValue,
        });
        expect(mockStorageApi.getItem).toHaveBeenCalledWith(docId);
      });
    });
  });

  describe('#set()', () => {
    it('sets the item value and emits undefined on success', () => {
      mockEmptyStorage();
      mockSuccessfulStorage();
      createTestScheduler().run(({ expectObservable }): void => {
        const value = { an: 'example' };
        expectObservable(store.set(value)).toBe('(a|)', { a: undefined });
        expect(mockStorageApi.setItem).toHaveBeenCalledWith(docId, value);
      });
    });

    it('errors when storage fails', () => {
      mockEmptyStorage();
      mockFailedStorage();
      createTestScheduler().run(({ expectObservable }): void => {
        expectObservable(store.set({ some: 'object' })).toBe(
          '#',
          null,
          MOCK_STORAGE_SAVE_ERROR,
        );
      });
    });
  });
});
