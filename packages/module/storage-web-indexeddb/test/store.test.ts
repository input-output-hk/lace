import 'fake-indexeddb/auto';
import {
  CollectionStore,
  DocumentStore,
  KeyValueStore,
} from '@lace-contract/storage';
import { firstValueFrom } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it } from 'vitest';

import moduleMap, { loadCreateDocumentStorage } from '../src';
import initializeStore from '../src/store/init';

import type { ModuleInitProps } from '@lace-contract/module';

const initialize = async () => {
  const { sideEffectDependencies } = await initializeStore(
    {} as ModuleInitProps,
    { logger: dummyLogger },
  );
  return sideEffectDependencies!;
};

describe('storage-web-indexeddb:store', () => {
  it('provides the storage side effect dependencies', async () => {
    const dependencies = await initialize();
    expect(
      dependencies.createKeyValueStorage!({ collectionId: 'key-values' }),
    ).toBeInstanceOf(KeyValueStore);
    expect(
      dependencies.createDocumentStorage!({ documentId: 'document' }),
    ).toBeInstanceOf(DocumentStore);
    expect(
      dependencies.createCollectionStorage!({ collectionId: 'collection' }),
    ).toBeInstanceOf(CollectionStore);
  });

  it('round-trips a document through IndexedDB', async () => {
    const dependencies = await initialize();
    const documentStorage = dependencies.createDocumentStorage!<{
      language: string;
    }>({ documentId: 'store-test-document' });
    await firstValueFrom(documentStorage.set({ language: 'en' }));
    await expect(firstValueFrom(documentStorage.get())).resolves.toEqual({
      language: 'en',
    });
  });
});

describe('storage-web-indexeddb:module', () => {
  it('is a guest-only module', () => {
    expect(Object.keys(moduleMap)).toEqual(['lace-extension-guest']);
    expect(moduleMap['lace-extension-guest']?.moduleName).toBe(
      'storage-web-indexeddb',
    );
  });

  it('loads createDocumentStorage for the feature flag bootstrap', async () => {
    const createDocumentStorage = await loadCreateDocumentStorage();
    expect(
      createDocumentStorage(
        { documentId: 'bootstrap-test-document' },
        { logger: dummyLogger },
      ),
    ).toBeInstanceOf(DocumentStore);
  });
});
