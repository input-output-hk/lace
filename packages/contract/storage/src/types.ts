import '@lace-contract/module';
import type { Observable } from 'rxjs';

export interface CollectionStorage<T> {
  /**
   * Get all stored documents.
   *
   * @returns {Observable}
   * - When have some documents stored: emits once and completes.
   * - When no documents are stored or the storage is destroyed: completes without emitting.
   */
  getAll: () => Observable<T[]>;
  /**
   * Similar to getAll, but does not complete. Instead, emits every time the collection is updated (via this storage object).
   * Emits empty array when no documents are stored.
   */
  observeAll: () => Observable<T[]>;
  /**
   * Store the full set of documents.
   * getAll() after setAll(docs) should return the same set of 'docs'.
   * Should never throw.
   *
   * @returns {Observable} Emits undefined and completes. Completes without emitting if the storage is destroyed.
   */
  setAll: (documents: T[]) => Observable<void>;
}

export interface DocumentStorage<T> {
  /**
   * Get the stored document.
   *
   * @returns {Observable}
   * - When have some document stored: emits once and completes.
   * - When no document is stored or the storage is destroyed: completes without emitting.
   */
  get: () => Observable<T>;
  /**
   * Store the document. Should never throw.
   *
   * @returns {Observable} Emits undefined and completes. Completes without emitting if the storage is destroyed.
   */
  set: (document: T) => Observable<void>;
}

export type CreateCollectionStorageProps<T> = {
  collectionId: string;
  computeDocId?: (document: T) => string;
};

export type CreateDocumentStorageProps = {
  documentId: string;
};

export interface StorageDependencies {
  createCollectionStorage: <T extends object>(
    props: Readonly<CreateCollectionStorageProps<T>>,
  ) => CollectionStorage<T>;
  createDocumentStorage: <T extends object>(
    props: Readonly<CreateDocumentStorageProps>,
  ) => DocumentStorage<T>;
  // createKeyValueStorage is defined in @lace-contract/module
  // because it's used when bootstrapping redux store.
  // It may be good to consolidate the 2 contracts to make it simpler.
}

/**
 * API interface used by stores to abstract over platform-specific async storages.
 */
export interface StorageAdapter<T> {
  /**
   * Get an item for given key from the storage.
   * @returns value on success
   * @returns null when item does not exist
   * @throws error on storage failure
   */
  getItem: (key: string) => Promise<T | null>;
  /**
   * Set an item for given key in the storage.
   * @returns undefined on success
   * @throws error on storage failure
   */
  setItem: (key: string, value: T) => Promise<void>;
  /**
   * Remove the item for given key in the storage.
   * @returns undefined on success
   * @throws error on storage failure
   */
  removeItem: (key: string) => Promise<void>;
}
