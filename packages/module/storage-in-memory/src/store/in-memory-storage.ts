/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable @typescript-eslint/member-ordering */

// Lifted directly from @cardano-sdk/wallet
import {
  concat,
  defaultIfEmpty,
  delay,
  EMPTY,
  of,
  race,
  Subject,
  tap,
} from 'rxjs';

import type { KeyValueStorage } from '@lace-contract/module';
import type {
  CollectionStorage,
  DocumentStorage,
} from '@lace-contract/storage';
import type { Observable } from 'rxjs';

export const observeAll =
  <T>(store: CollectionStorage<T>, updates$: Subject<T[]>) =>
  () => {
    return race(
      concat(store.getAll().pipe(defaultIfEmpty([])), updates$),
      updates$,
    );
  };

export class InMemoryCollectionStore<T> implements CollectionStorage<T> {
  readonly #updates$ = new Subject<T[]>();
  protected docs: T[] = [];
  observeAll: CollectionStorage<T>['observeAll'];

  constructor() {
    this.observeAll = observeAll(this, this.#updates$);
  }

  getAll(): Observable<T[]> {
    if (this.docs.length === 0) return EMPTY;
    return of(this.docs);
  }

  setAll(docs: T[]): Observable<void> {
    this.docs = docs;
    return of(void 0).pipe(
      // if setAll is called on 1st emission of observeAll,
      // then this has to be asynchronous for observeAll to emit the 2nd item.
      // any delay duration is ok: it's enough that this is called in the next tick
      delay(1),
      tap(() => {
        this.#updates$.next(this.docs);
      }),
    );
  }
}

export class InMemoryDocumentStore<T> implements DocumentStorage<T> {
  #doc: T | null = null;

  get(): Observable<T> {
    if (!this.#doc) return EMPTY;
    return of(this.#doc);
  }

  set(doc: T): Observable<void> {
    this.#doc = doc;
    return of(void 0);
  }
}

export class InMemoryKeyValueStore<K, V> implements KeyValueStorage<K, V> {
  readonly #values = new Map<K, V>();
  getValues(keys: readonly K[]) {
    const values = keys
      .map(k => this.#values.get(k))
      .filter((v): v is V => v !== undefined);
    if (values.length !== keys.length) {
      return EMPTY;
    }
    return of(values);
  }
  setValue(key: K, value: V | undefined): Observable<void> {
    if (value) {
      this.#values.set(key, value);
    } else {
      this.#values.delete(key);
    }
    return of(void 0);
  }
}
