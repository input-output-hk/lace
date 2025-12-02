/* eslint-disable @typescript-eslint/ban-types, brace-style */
import { ExtensionDocumentStore } from './extension-document-store';
import { storage as sdkStorage } from '@cardano-sdk/wallet';
import { Logger } from 'ts-log';
import { concat, defaultIfEmpty, EMPTY, filter, map, mergeMap, Observable, of } from 'rxjs';
import { isNotNil } from '@cardano-sdk/util';

/**
 * Stores entire collection in a single document
 */
export class ExtensionBlobCollectionStore<T extends {}>
  extends ExtensionDocumentStore<T[]>
  implements sdkStorage.CollectionStore<T>
{
  /**
   * @param collectionName used as extension storage key
   */
  constructor(collectionName: string, logger: Logger) {
    super(collectionName, logger);
  }

  observeAll(): Observable<T[]> {
    return concat(
      this.get().pipe(defaultIfEmpty([])),
      this.documentChange$.pipe(
        map(({ newValue }) => newValue),
        filter(isNotNil)
      )
    );
  }

  getAll(): Observable<T[]> {
    return this.get().pipe(mergeMap((items) => (items.length > 0 ? of(items) : EMPTY)));
  }

  setAll(docs: T[]): Observable<void> {
    return this.set(docs);
  }
}
