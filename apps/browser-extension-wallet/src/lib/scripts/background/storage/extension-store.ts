/* eslint-disable @typescript-eslint/ban-types */
import { storage as extensionStorage, Storage } from 'webextension-polyfill';
import { fromEventPattern, mergeMap, Observable, share } from 'rxjs';
import { Logger } from 'ts-log';
import { fromSerializableObject } from '@cardano-sdk/util';

export abstract class ExtensionStore {
  protected readonly storageChange$: Observable<{ key: string; change: Storage.StorageChange }>;
  protected readonly storage: Storage.StorageArea;

  constructor(protected logger: Logger) {
    this.storage = extensionStorage.local;
    this.storageChange$ = fromEventPattern<Storage.StorageAreaOnChangedChangesType>(
      (handler) => this.storage.onChanged.addListener(handler),
      (handler) => this.storage.onChanged.removeListener(handler)
    ).pipe(
      mergeMap((changes) =>
        Object.entries(changes).map(([key, change]) => ({ key, change: fromSerializableObject(change) }))
      ),
      share()
    );
  }
}
