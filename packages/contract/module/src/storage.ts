import { type Observable } from 'rxjs';

/** Options for a key-value storage: `collectionId` names the collection its entries are kept in. */
export type CreateKeyValueStorageProps = {
  collectionId: string;
};

/** Asynchronous key-value storage for one collection. */
export interface KeyValueStorage<K, V> {
  /**
   * Get the stored documents by keys.
   *
   * @returns
   * - When have all requested documents: emits once and completes.
   * - When at least one document is missing or the storage is destroyed: completes without emitting.
   */
  getValues: (keys: readonly K[]) => Observable<V[]>;
  /** Store the value. If `value` is undefined, remove it from storage. */
  setValue: (key: K, value: V | undefined) => Observable<void>;
}

/** Creates a {@link KeyValueStorage} for a collection. */
export type KeyValueStorageFactory = <K extends string, V>(
  props: Readonly<CreateKeyValueStorageProps>,
) => KeyValueStorage<K, V>;

/** The side-effect dependency through which modules obtain key-value storage; the storage module provides it. */
export interface KeyValueStorageDependencies {
  // createDocumentStorage and createCollectionStorage are defined in @lace-contract/storage
  createKeyValueStorage: KeyValueStorageFactory;
}
