import { contextLogger } from '@cardano-sdk/util';
import isEqual from 'lodash/isEqual';
import {
  concat,
  defaultIfEmpty,
  distinctUntilChanged,
  EMPTY,
  mergeMap,
  of,
  ReplaySubject,
  tap,
} from 'rxjs';

import { DocumentStore } from './document-store';

import type { CollectionStorage, StorageAdapter } from '../index';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

/**
 * A store that manages a collection of items persisted in a single document.
 */
export class CollectionStore<T>
  extends DocumentStore<T[]>
  implements CollectionStorage<T>
{
  /**
   * Manages an in-memory collection as ReplaySubject, exposed as an
   * observable that doesn't complete immediately but continuously informs
   * about changes to the collection when calling observeAll().
   */
  private readonly inMemoryCollection: ReplaySubject<T[]>;
  private readonly inMemoryCollection$: Observable<T[]>;

  public constructor(
    collectionName: string,
    storage: StorageAdapter<T[]>,
    logger: Logger,
  ) {
    super(collectionName, storage, contextLogger(logger, `CollectionStore`));

    this.inMemoryCollection = new ReplaySubject<T[]>(1);
    this.inMemoryCollection$ = this.inMemoryCollection.asObservable();
  }

  public getAll(): Observable<T[]> {
    return this.get().pipe(
      mergeMap(items => (items.length > 0 ? of(items) : EMPTY)),
    );
  }

  public setAll(docs: T[]): Observable<void> {
    return this.set(docs).pipe(
      tap(() => {
        this.inMemoryCollection.next(docs);
      }),
    );
  }

  public observeAll(): Observable<T[]> {
    return concat(
      this.getAll().pipe(defaultIfEmpty([])),
      this.inMemoryCollection$,
    ).pipe<T[]>(distinctUntilChanged(isEqual));
  }
}
