import { contextLogger } from '@cardano-sdk/util';
import isEqual from 'lodash/isEqual';
import {
  concat,
  defaultIfEmpty,
  defer,
  distinctUntilChanged,
  EMPTY,
  from,
  mergeMap,
  of,
  ReplaySubject,
} from 'rxjs';

import type { CollectionStorage, StorageAdapter } from '../index';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

/**
 * Stored at the collection's root key. Replaces the legacy layout, where the
 * root key held the full document array: writing the index over the legacy
 * array is a single-key operation, so it doubles as the atomic
 * migration-complete marker (no crash window between "documents split" and
 * "legacy removed").
 */
// Keep every field primitive: Serializable.to is the identity only for these,
// which is what lets isCollectionIndex be trusted against real storage.
type CollectionIndex = {
  docIds: string[];
  /**
   * Stamped, deliberately not validated on read: rejecting an unknown version
   * would send a future v2 index down the unrecognised-root path, orphaning
   * every document. It is here so a future WRITER can branch.
   */
  version: 1;
};

const isCollectionIndex = (value: unknown): value is CollectionIndex =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Array.isArray((value as CollectionIndex).docIds);

/**
 * A store that persists each document of a collection under its own storage
 * key (`"<collectionId>/<docId>"`), with an ordered index document at the
 * root key.
 *
 * Per-document keys make concurrent writers of DIFFERENT documents safe by
 * construction: upsert/removeWhere never rewrite documents they were not
 * asked to touch. All operations of one instance are serialized through an
 * internal queue so index updates and the lazy legacy migration cannot
 * interleave.
 */
export class CollectionStore<T> implements CollectionStorage<T> {
  private readonly collectionId: string;
  private readonly storage: StorageAdapter<unknown>;
  private readonly computeDocId: (document: T) => string;
  private readonly logger: Logger;

  /**
   * In-memory mirror for observeAll(). Valid only under the single-writer
   * invariant {@link CollectionStorage} declares; getAll() re-reads storage
   * and re-hydrates.
   */
  private readonly inMemoryCollection = new ReplaySubject<T[]>(1);
  private readonly documents = new Map<string, T>();
  private docIds: string[] | null = null;
  private isHydrated = false;
  /** Ids whose document could not be READ during the last readAll(). */
  private readonly unreadableDocIds = new Set<string>();
  /**
   * False only while the root key holds a value this store cannot recognise.
   * A read FAILURE never lands here — it propagates — so any index that loaded,
   * including a genuinely absent one, is authoritative.
   */
  private isIndexTrusted = false;

  private queue: Promise<unknown> = Promise.resolve();

  public constructor({
    collectionId,
    storage,
    logger,
    computeDocId,
  }: {
    collectionId: string;
    storage: StorageAdapter<unknown>;
    logger: Logger;
    computeDocId: (document: T) => string;
  }) {
    this.collectionId = collectionId;
    this.storage = storage;
    this.logger = contextLogger(logger, `CollectionStore(${collectionId})`);
    this.computeDocId = computeDocId;
  }

  public getAll(): Observable<T[]> {
    return this.enqueue(async () => this.readAll()).pipe(
      mergeMap(items => (items.length > 0 ? of(items) : EMPTY)),
    );
  }

  public get(docId: string): Observable<T> {
    return this.enqueue(async () => {
      // Membership is decided by the index, so an id that was never stored
      // costs one index read and no document read.
      const docIds = await this.loadIndex();
      if (!docIds.includes(docId)) return undefined;
      const { value } = await this.safeGetItem(this.docKey(docId));
      if (value === null || value === undefined) {
        // Matches readAll: one unreadable document degrades alone. The caller
        // sees "absent", which for a restore means "start fresh" rather than
        // failing the account outright.
        this.logger.warn(
          `Document '${docId}' of collection '${this.collectionId}' is missing or unreadable; skipping`,
        );
        return undefined;
      }
      return value as T;
    }).pipe(
      mergeMap(document => (document === undefined ? EMPTY : of(document))),
    );
  }

  public observeAll(): Observable<T[]> {
    return concat(
      this.getAll().pipe(defaultIfEmpty([])),
      this.inMemoryCollection,
    ).pipe<T[]>(distinctUntilChanged(isEqual));
  }

  public setAll(documents: T[]): Observable<void> {
    return this.enqueueMutation(async () => {
      const previousDocIds = await this.loadIndex();
      const docIds: string[] = [];
      for (const document of documents) {
        const docId = this.computeDocId(document);
        if (!docIds.includes(docId)) docIds.push(docId);
        await this.storage.setItem(this.docKey(docId), document);
        this.documents.set(docId, document);
      }
      for (const staleId of previousDocIds.filter(
        docId => !docIds.includes(docId),
      )) {
        await this.storage.removeItem(this.docKey(staleId));
        this.documents.delete(staleId);
      }
      await this.writeIndex(docIds);
      this.isHydrated = true;
      this.inMemoryCollection.next(documents);
    });
  }

  public upsert(document: T): Observable<void> {
    return this.enqueueMutation(async () => {
      if (!this.isHydrated) await this.readAll();
      const docId = this.computeDocId(document);
      await this.storage.setItem(this.docKey(docId), document);
      this.documents.set(docId, document);
      if (!this.docIds?.includes(docId)) {
        await this.writeIndex([...(this.docIds ?? []), docId]);
      }
      this.emitSnapshot();
    });
  }

  public removeWhere(predicate: (document: T) => boolean): Observable<void> {
    return this.enqueueMutation(async () => {
      const allDocuments = await this.readAll();
      if (this.unreadableDocIds.size > 0) {
        // An unreadable document was never offered to the predicate, so it may
        // be one the caller asked to remove. Removal is destructive and its
        // callers act on the result — a resync tells the user their state is
        // discarded, then restores from the document that was never deleted.
        // Failing is recoverable; a false success is not.
        throw new Error(
          `Cannot remove from collection '${this.collectionId}': document(s) ${[
            ...this.unreadableDocIds,
          ].join(', ')} could not be read`,
        );
      }
      const removedIds = allDocuments
        .filter(document => predicate(document))
        .map(document => this.computeDocId(document));
      if (removedIds.length === 0) return;
      for (const docId of removedIds) {
        await this.storage.removeItem(this.docKey(docId));
        this.documents.delete(docId);
      }
      await this.writeIndex(
        (this.docIds ?? []).filter(docId => !removedIds.includes(docId)),
      );
      this.emitSnapshot();
    });
  }

  public clear(): Observable<void> {
    return this.enqueueMutation(async () => {
      const docIds = await this.loadIndex();
      if (!this.isIndexTrusted) {
        // The root holds an unrecognised value, so no doc ids can be derived
        // and only the empty-index write below is possible — resync semantics
        // forbid old state from reviving. Any unreferenced document keys that
        // remain are overwritten when their accounts persist again (doc ids
        // are deterministic).
        this.logger.warn(
          `Clearing collection '${this.collectionId}' with an unrecognised index; unreferenced document keys may remain`,
        );
      }
      for (const docId of docIds) {
        await this.storage.removeItem(this.docKey(docId));
      }
      // An empty index (not a removed root key) keeps the migration marker in
      // place, so legacy detection cannot re-trigger. Written BEFORE the
      // in-memory caches are committed: if it fails, enqueueMutation drops
      // the caches and the next operation re-reads storage.
      await this.writeIndex([]);
      this.documents.clear();
      this.isHydrated = true;
      this.emitSnapshot();
    });
  }

  private docKey(docId: string): string {
    return `${this.collectionId}/${docId}`;
  }

  /**
   * enqueue() for mutations: a mutation that fails midway leaves memory and
   * storage out of sync, so all caches are dropped on error and the next
   * operation re-reads storage instead of trusting (and re-writing) a
   * partial in-memory state.
   */
  private enqueueMutation<R>(work: () => Promise<R>): Observable<R> {
    return this.enqueue(async () => {
      try {
        return await work();
      } catch (error) {
        this.docIds = null;
        this.isIndexTrusted = false;
        this.isHydrated = false;
        throw error;
      }
    });
  }

  /**
   * Serializes every operation of this instance. Index consistency and the
   * lazy migration depend on operations not interleaving; per-document
   * payload writes themselves would be safe unordered.
   */
  private enqueue<R>(work: () => Promise<R>): Observable<R> {
    return defer(() => {
      const run = this.queue.then(work, work);
      this.queue = run.catch(() => undefined);
      return from(run);
    });
  }

  /**
   * Reads the root key, migrating the legacy single-array layout on first
   * encounter. Returns the ordered doc id list.
   *
   * Reads the root key directly, so a storage failure propagates and aborts
   * the operation. Degrading it to "absent" instead would rewrite the index
   * from a wrongly-empty list and orphan intact sibling documents — the
   * adapter contract exists to keep absence and failure distinguishable here.
   */
  private async loadIndex(): Promise<string[]> {
    if (this.docIds && this.isIndexTrusted) return this.docIds;
    const root = await this.storage.getItem(this.collectionId);
    if (root === null || root === undefined) {
      this.docIds = [];
      this.isIndexTrusted = true;
      return this.docIds;
    }
    if (isCollectionIndex(root)) {
      this.docIds = [...root.docIds];
      this.isIndexTrusted = true;
      return this.docIds;
    }
    if (Array.isArray(root)) {
      this.docIds = await this.migrateLegacyArray(root as T[]);
      return this.docIds;
    }
    this.logger.error(
      `Unrecognized root value for collection '${this.collectionId}'; treating as empty`,
    );
    this.docIds = [];
    return this.docIds;
  }

  /**
   * Splits the legacy whole-collection array into per-document keys.
   *
   * Write order is load-bearing: documents first, index last. The index
   * overwrites the legacy array at the same key, atomically completing the
   * migration. If interrupted, the next attempt re-runs — existing
   * per-document keys are skipped because they can only be same-or-newer
   * than the legacy snapshot that is still in place.
   */
  private async migrateLegacyArray(legacyDocuments: T[]): Promise<string[]> {
    const docIds: string[] = [];
    for (const document of legacyDocuments) {
      const docId = this.computeDocId(document);
      if (docIds.includes(docId)) continue;
      docIds.push(docId);
      // Direct read: a swallowed failure would read as "absent" and overwrite
      // an already-migrated, newer document with the older legacy snapshot,
      // breaking the same-or-newer invariant above.
      const existing = await this.storage.getItem(this.docKey(docId));
      if (existing === null || existing === undefined) {
        await this.storage.setItem(this.docKey(docId), document);
      }
    }
    await this.writeIndex(docIds);
    this.logger.info(
      `Migrated ${docIds.length} document(s) of collection '${this.collectionId}' to per-document keys`,
    );
    return docIds;
  }

  private async readAll(): Promise<T[]> {
    const docIds = await this.loadIndex();
    const documents: T[] = [];
    this.documents.clear();
    this.unreadableDocIds.clear();
    for (const docId of docIds) {
      const { value, hasFailed } = await this.safeGetItem(this.docKey(docId));
      if (hasFailed) this.unreadableDocIds.add(docId);
      if (value === null || value === undefined) {
        // A single unreadable document degrades alone instead of taking the
        // whole collection down with it.
        this.logger.warn(
          `Document '${docId}' of collection '${this.collectionId}' is missing or unreadable; skipping`,
        );
        continue;
      }
      documents.push(value as T);
      this.documents.set(docId, value as T);
    }
    // An untrusted (possibly failed) index read must not count as hydration,
    // or the next writer would trust the empty in-memory state.
    this.isHydrated = this.isIndexTrusted;
    return documents;
  }

  private async writeIndex(docIds: string[]): Promise<void> {
    await this.storage.setItem(this.collectionId, {
      docIds,
      version: 1,
    } satisfies CollectionIndex);
    this.docIds = docIds;
    this.isIndexTrusted = true;
  }

  private emitSnapshot(): void {
    const docIds = this.docIds ?? [];
    this.inMemoryCollection.next(
      docIds.flatMap(docId => {
        const document = this.documents.get(docId);
        return document === undefined ? [] : [document];
      }),
    );
  }

  /**
   * Reads a document key, keeping FAILED distinct from ABSENT. Collapsing the
   * two loses the only signal a destructive caller has: an absent document is
   * nothing to delete, an unreadable one may be exactly what it was asked to
   * delete.
   */
  private async safeGetItem(
    key: string,
  ): Promise<{ value: unknown; hasFailed: boolean }> {
    try {
      return { value: await this.storage.getItem(key), hasFailed: false };
    } catch (error) {
      this.logger.warn(`Failed to read '${key}'; treating as absent`, error);
      return { value: null, hasFailed: true };
    }
  }
}
