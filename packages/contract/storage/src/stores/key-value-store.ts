import { contextLogger } from '@cardano-sdk/util';
import { catchError, EMPTY, forkJoin, last, tap } from 'rxjs';

import { BaseStore } from './base-store';

import type { StorageAdapter } from '../types';
import type { KeyValueStorage } from '@lace-contract/module';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

/**
 * A store that manages key/value pairs under a common namespace.
 */
export class KeyValueStore<K extends string, V>
  extends BaseStore<V>
  implements KeyValueStorage<K, V>
{
  private readonly namespace: string;

  public constructor(
    namespace: string,
    storage: StorageAdapter<V>,
    logger: Logger,
  ) {
    super(storage, contextLogger(logger, `KeyValueStore(${namespace})`));
    this.namespace = namespace;
  }

  public getValues(keys: readonly K[]): Observable<V[]> {
    this.logger.debug('getValues', keys);
    /**
     * Maps given keys to getItem requests from the base store and fork joins
     * them so that either all resulting values are returned as a single array
     * in the same order as the input keys array OR it emits nothing and completes
     * immediately if any of the requests fails.
     */
    return forkJoin(
      keys.map(key =>
        this.getItem(this.getNamespacedKey(key)).pipe(
          // The last() operator is used to log errors for failed getItem requests
          last(),
          catchError(() => {
            this.logger.debug(`Key "$${key}" was not found`);
            return EMPTY;
          }),
        ),
      ),
    ).pipe(
      tap(result => {
        this.logger.debug('getValues:result', keys, result);
      }),
    );
  }

  public setValue(key: K, value: V | undefined): Observable<void> {
    this.logger.debug('setValue', key, value);
    if (value === undefined) {
      return this.removeItem(this.getNamespacedKey(key));
    }
    return this.setItem(this.getNamespacedKey(key), value);
  }

  public getNamespacedKey(key: string) {
    return `${this.namespace}:${key}`;
  }
}
