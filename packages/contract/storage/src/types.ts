import '@lace-contract/module';
import type { Observable } from 'rxjs';

/**
 * A collection of documents, each addressed by a caller-computed doc id.
 *
 * **Exactly one instance per collection id may write, per platform context.**
 * The implementation keeps an in-memory index and document mirror, so a second
 * writing instance over the same keys would silently orphan the other's
 * documents on its next index write. Share one instance rather than
 * constructing a second.
 *
 * A failed INDEX read ERRORS rather than degrading to "empty": reporting it as
 * an empty collection would let the next write rebuild the index from that
 * empty view and orphan every document the caller never inspected. Writes error
 * likewise, so a dropped write cannot pass for a successful one. Callers that
 * can tolerate either failure must catch it and record why.
 *
 * A single unreadable DOCUMENT does not fail a READ. It is logged and omitted
 * from the result, because one corrupt document must not deny the caller the
 * rest of a collection it can still use — the index is intact, so nothing is
 * orphaned. It DOES fail `removeWhere`, which cannot evaluate its predicate
 * against a document it could not read and must not report a removal it may
 * not have performed.
 */
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
   * Get the single document with this computed doc id.
   *
   * The keyed counterpart to {@link getAll}: one adapter read of that
   * document's own key, with no index-wide scan. Restoring one entity of a
   * collection must not cost a read of every other entity's payload — with
   * per-document keys that is the whole point of the layout.
   *
   * @returns {Observable}
   * - When the document is stored and readable: emits once and completes.
   * - When it is absent, unreadable, or the storage is destroyed: completes
   *   without emitting. An unreadable document is logged, matching getAll.
   */
  get: (docId: string) => Observable<T>;
  /**
   * Similar to getAll, but does not complete. Instead, emits every time the collection is updated (via this storage object).
   * Emits empty array when no documents are stored.
   */
  observeAll: () => Observable<T[]>;
  /**
   * Store the full set of documents.
   * getAll() after setAll(docs) should return the same set of 'docs'.
   *
   * @deprecated Prefer upsert/removeWhere/clear, which only touch the documents
   * they name. This replaces documents the caller never inspected, and an
   * unreadable index reads as an empty collection — so one read glitch turns
   * the call into "delete everything". No caller remains.
   *
   * @returns {Observable} Emits undefined and completes. Completes without emitting if the storage is destroyed.
   */
  setAll: (documents: T[]) => Observable<void>;
  /**
   * Insert the document, or replace the stored document with the same
   * computed doc id. Safe for concurrent writers of DIFFERENT documents.
   *
   * @returns {Observable} Emits undefined and completes. Completes without emitting if the storage is destroyed.
   */
  upsert: (document: T) => Observable<void>;
  /**
   * Remove every stored document matching the predicate.
   *
   * @returns {Observable} Emits undefined and completes. Completes without emitting if the storage is destroyed.
   */
  removeWhere: (predicate: (document: T) => boolean) => Observable<void>;
  /**
   * Remove all stored documents.
   *
   * @returns {Observable} Emits undefined and completes. Completes without emitting if the storage is destroyed.
   */
  clear: () => Observable<void>;
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
   * Store the document.
   *
   * @returns {Observable} Emits undefined and completes. Completes without emitting if the storage is destroyed.
   */
  set: (document: T) => Observable<void>;
}

export type CreateCollectionStorageProps<T> = {
  collectionId: string;
  /**
   * Derives the storage key suffix for a document. Documents whose ids
   * collide overwrite each other, so the id must be unique per document
   * (typically the entity's primary id).
   */
  computeDocId: (document: T) => string;
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
