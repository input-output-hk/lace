/* eslint-disable @typescript-eslint/ban-types */
import { storage as sdkStorage } from '@cardano-sdk/wallet';
import { EMPTY, filter, from, map, mergeMap, Observable, of, share } from 'rxjs';
import { Logger } from 'ts-log';
import { contextLogger, fromSerializableObject, toSerializableObject } from '@cardano-sdk/util';
import { ExtensionStore } from './extension-store';

export type DocumentChange<T> = {
  oldValue?: T;
  newValue?: T;
};

const undefinedIfEmpty = <T>(value: T | undefined): T | undefined => {
  if (typeof value === 'object' && (value === null || Object.keys(value).length === 0)) return undefined;
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
   */
  constructor(protected docId: string, logger: Logger) {
    super(contextLogger(logger, `ExtensionStore(${docId})`));
    this.documentChange$ = this.storageChange$.pipe(
      filter(({ key }) => key === docId),
      map(
        ({ change }): DocumentChange<T> => ({
          oldValue: undefinedIfEmpty(change.oldValue),
          newValue: undefinedIfEmpty(change.newValue)
        })
      ),
      share()
    );
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
      (this.idle = this.idle.then(() =>
        this.storage.set({
          [this.docId]: toSerializableObject(doc)
        })
      ))
    );
  }

  destroy(): Observable<void> {
    this.destroyed = true;
    // eslint-disable-next-line unicorn/no-null
    return this.set(null);
  }
}
