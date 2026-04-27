import {
  CollectionStore,
  type CreateCollectionStorageProps,
  type CreateDocumentStorageProps,
  KeyValueStore,
  type StorageAdapter,
  type StorageDependencies,
} from '@lace-contract/storage';

import { createDocumentStorage } from '../create-document-storage';
import { storageApi } from '../storage-api-adapter';

import type {
  CreateKeyValueStorageProps,
  KeyValueStorageDependencies,
  LaceInitSync,
} from '@lace-contract/module';

export const initializeDependencies: LaceInitSync<
  KeyValueStorageDependencies & StorageDependencies
> = (_, { logger }) => {
  return {
    createDocumentStorage: <T extends object>(
      props: Readonly<CreateDocumentStorageProps>,
    ) => createDocumentStorage<T>(props, { logger }),
    createKeyValueStorage: <K extends string, V>(
      props: Readonly<CreateKeyValueStorageProps>,
    ) =>
      new KeyValueStore<K, V>(
        props.collectionId,
        storageApi as StorageAdapter<V>,
        logger,
      ),
    createCollectionStorage: <T extends object>({
      collectionId,
    }: Readonly<CreateCollectionStorageProps<T>>) =>
      new CollectionStore<T>(
        collectionId,
        storageApi as StorageAdapter<T[]>,
        logger,
      ),
  };
};
