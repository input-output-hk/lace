/* eslint-disable @typescript-eslint/ban-types, brace-style */
import { ExtensionDocumentStore } from './extension-document-store';
import { storage as sdkStorage } from '@cardano-sdk/wallet';
import { Logger } from 'ts-log';
import { defaultIfEmpty, EMPTY, firstValueFrom, from, mergeMap, Observable, of } from 'rxjs';
import { toSerializableObject } from '@cardano-sdk/util';

/**
 * Stores entire key-value collection in a single document
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ExtensionBlobKeyValueStore<K extends string, V extends {}>
  extends ExtensionDocumentStore<Record<K, V>>
  implements sdkStorage.KeyValueStore<K, V>
{
  /**
   * @param collectionName used as extension storage key
   */
  constructor(collectionName: string, logger: Logger) {
    super(collectionName, logger);
  }

  getValues(keys: K[]): Observable<V[]> {
    return this.get().pipe(
      mergeMap((collection): Observable<V[]> => {
        const values: V[] = [];
        for (const key of keys) {
          const value = collection[key];
          if (!value) {
            this.logger.debug(`Key "$${key.toString()}" was not found`);
            return EMPTY;
          }
          values.push(value);
        }
        return of(values);
      })
    );
  }

  setValue(key: K, value: V): Observable<void> {
    return from(
      (this.idle = this.idle.then(async () => {
        const collection = await firstValueFrom(this.get().pipe(defaultIfEmpty({} as Record<K, V>)));
        return this.storage.set({
          [this.docId]: toSerializableObject({
            ...collection,
            [key]: value
          })
        });
      }))
    );
  }

  setAll(docs: sdkStorage.KeyValueCollection<K, V>[]): Observable<void> {
    return this.set(
      docs.reduce((collection, { key, value }) => {
        collection[key] = value;
        return collection;
      }, {} as Record<K, V>)
    );
  }
}
