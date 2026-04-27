import { type Observable } from 'rxjs';

export type CreateKeyValueStorageProps = {
  collectionId: string;
};

export interface KeyValueStorage<K, V> {
  /**
   * Get the stored documents by keys.
   *
   * @returns {Observable}
   * - When have all requested documents: emits once and completes.
   * - When at least one document is missing or the storage is destroyed: completes without emitting.
   */
  getValues: (keys: readonly K[]) => Observable<V[]>;
  /** Store the value. If `value` is undefined, remove it from storage. */
  setValue: (key: K, value: V | undefined) => Observable<void>;
}

export type KeyValueStorageFactory = <K extends string, V>(
  props: Readonly<CreateKeyValueStorageProps>,
) => KeyValueStorage<K, V>;

export interface KeyValueStorageDependencies {
  // createDocumentStorage and createCollectionStorage are defined in @lace-contract/storage
  createKeyValueStorage: KeyValueStorageFactory;
}
