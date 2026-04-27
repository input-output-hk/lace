import {
  type CreateDocumentStorageProps,
  DocumentStore,
  type StorageAdapter,
} from '@lace-contract/storage';

import { storageApi } from './storage-api-adapter';

import type { WithLogger } from '@cardano-sdk/util';

export const createDocumentStorage = <T extends object>(
  { documentId }: Readonly<CreateDocumentStorageProps>,
  { logger }: Readonly<WithLogger>,
) => new DocumentStore<T>(documentId, storageApi as StorageAdapter<T>, logger);
