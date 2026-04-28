import { EMPTY, from, mergeMap, of } from 'rxjs';

import type { StorageAdapter } from '../types';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

/**
 * The base store class that interacts with the StoreAdapter interface
 * to retrieve and store values. This class is extended by more specific store
 * implementations and cannot be used directly.
 */
export abstract class BaseStore<T> {
  protected readonly storage: StorageAdapter<T>;
  protected readonly logger: Logger;

  protected constructor(storage: StorageAdapter<T>, logger: Logger) {
    this.storage = storage;
    this.logger = logger;
  }

  /**
   * Retrieves a value for given key from the underlying storage api.
   *
   * If there is nothing stored for the key or there is an error it completes
   * immediately without emitting a value.
   */
  protected getItem(key: string): Observable<T> {
    return from(this.storage.getItem(key)).pipe(
      mergeMap(value => {
        if (value === null) return EMPTY;
        return of(value);
      }),
    );
  }

  /**
   * Stores a given key value in the underlying storage api.
   *
   * Emits undefined on success. If there was an error it completes immediately
   * without emitting a value.
   */
  protected setItem(key: string, value: T): Observable<void> {
    return from(this.storage.setItem(key, value));
  }

  /**
   * Removes the given key value from the underlying storage API and emits
   * undefined on success.
   */
  protected removeItem(key: string): Observable<void> {
    this.logger.debug('removeItem', key);
    return from(this.storage.removeItem(key));
  }
}
