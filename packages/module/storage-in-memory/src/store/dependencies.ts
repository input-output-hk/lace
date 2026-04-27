import {
  InMemoryCollectionStore,
  InMemoryDocumentStore,
  InMemoryKeyValueStore,
} from './in-memory-storage';

import type { KeyValueStorageDependencies } from '@lace-contract/module';
import type {
  CreateCollectionStorageProps,
  CreateDocumentStorageProps,
  StorageDependencies,
} from '@lace-contract/storage';

export const sideEffectDependencies: KeyValueStorageDependencies &
  StorageDependencies = {
  createDocumentStorage: (_props: Readonly<CreateDocumentStorageProps>) =>
    new InMemoryDocumentStore(),
  createKeyValueStorage: _props => new InMemoryKeyValueStore(),
  createCollectionStorage: <T extends object>({
    collectionId: _collectionId,
    computeDocId: _computeDocId,
  }: Readonly<CreateCollectionStorageProps<T>>) =>
    new InMemoryCollectionStore(),
};
