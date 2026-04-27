import { contextLogger } from '@cardano-sdk/util';
import { tap } from 'rxjs';

import { BaseStore } from './base-store';

import type { DocumentStorage, StorageAdapter } from '../index';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

/**
 * A store that manages a single document key value.
 */
export class DocumentStore<T>
  extends BaseStore<T>
  implements DocumentStorage<T>
{
  protected readonly docId: string;

  public constructor(
    docId: string,
    storage: StorageAdapter<T>,
    logger: Logger,
  ) {
    super(storage, contextLogger(logger, `DocumentStore(${docId})`));
    this.docId = docId;
  }

  public get(): Observable<T> {
    this.logger.debug('get', this.docId);
    return this.getItem(this.docId).pipe(
      tap(result => {
        this.logger.debug('setValue:result', this.docId, result);
      }),
    );
  }

  public set(doc: T): Observable<void> {
    this.logger.debug('set', this.docId, doc);
    return this.setItem(this.docId, doc);
  }
}
