import { DocumentStore } from '@lace-contract/storage';

import { storageApi } from './storage-api-adapter';

import type { WithLogger } from '@cardano-sdk/util';
import type {
  CreateDocumentStorageProps,
  StorageAdapter,
} from '@lace-contract/storage';

export const createDocumentStorage = <T extends object>(
  { documentId }: Readonly<CreateDocumentStorageProps>,
  { logger }: Readonly<WithLogger>,
) => new DocumentStore<T>(documentId, storageApi as StorageAdapter<T>, logger);
