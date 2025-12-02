/* eslint-disable @typescript-eslint/ban-types */
import { storage as sdkStorage } from '@cardano-sdk/wallet';
import { EMPTY, filter, from, map, mergeMap, Observable, of, share, firstValueFrom } from 'rxjs';
import { Logger } from 'ts-log';
import { contextLogger, fromSerializableObject, toSerializableObject } from '@cardano-sdk/util';
import { ExtensionStore } from './extension-store';
import isEqual from 'lodash/isEqual';

export type DocumentChange<T> = {
  oldValue?: T;
  newValue?: T;
};

const undefinedIfEmptyObj = <T>(value: T | undefined): T | undefined => {
  if (typeof value === 'object' && !Array.isArray(value) && (value === null || Object.keys(value).length === 0))
    return undefined;
  // eslint-disable-next-line consistent-return
  return value;
};

export class ExtensionDocumentStore<T extends {}> extends ExtensionStore implements sdkStorage.DocumentStore<T> {
  // TODO: remove this when moving the interface to lace-platform,, it's not used
  public destroyed: boolean;

  protected documentChange$: Observable<DocumentChange<T>>;

  // used to serialize the writes
  protected idle: Promise<void> = Promise.resolve();

  /**
   * @param docId unique document id within the store, used as extension storage key
   * @param logger
   */
  constructor(protected docId: string, logger: Logger) {
    super(contextLogger(logger, `ExtensionStore(${docId})`));
    this.documentChange$ = this.storageChange$.pipe(
      filter(({ key }) => key === docId),
      map(
        ({ change }): DocumentChange<T> => ({
          oldValue: undefinedIfEmptyObj(change.oldValue),
          newValue: undefinedIfEmptyObj(change.newValue)
        })
      ),
      share()
    );
  }

  delete(): Observable<void> {
    return from(this.storage.remove(this.docId));
  }

  get(): Observable<T> {
    return from(this.storage.get(this.docId)).pipe(
      mergeMap((values) => {
        const value = values[this.docId];
        this.logger.debug('get', value);
        return value ? of(fromSerializableObject(value)) : EMPTY;
      })
    );
  }

  set(doc: T): Observable<void> {
    this.logger.debug('set', doc);
    return from(
      (this.idle = this.idle.then(async () => {
        const previousValueMap = await this.storage.get(this.docId);
        const previousValue = fromSerializableObject(previousValueMap[this.docId]);
        if (isEqual(previousValue, doc)) {
          // if values are equal, then we would set to the same value and
          // this.documentChange$ won't emit and this promise will never resolve
          return;
        }

        const storageChange = firstValueFrom(this.documentChange$);
        await this.storage.set({
          [this.docId]: toSerializableObject(doc)
        });
        // do not emit until documentChange$ emits
        // in order to avoid race conditions:
        // users expect `observeAll` to emit new value when subscribing
        // to it immediatelly after `set` emits
        await storageChange;
      }))
    );
  }

  destroy(): Observable<void> {
    this.destroyed = true;
    // eslint-disable-next-line unicorn/no-null
    return this.set(null);
  }
}
