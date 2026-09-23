import { lastValueFrom, toArray } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it } from 'vitest';

import { CollectionStore } from '../../src';

import type { StorageAdapter } from '../../src';
import type { Observable } from 'rxjs';

type TestDoc = { id: string; value: number };

type CollectionIndex = { docIds: string[]; version: 1 };

const computeDocId = (document: TestDoc): string => document.id;

const COLLECTION_ID = 'col';
const docKey = (docId: string): string => `${COLLECTION_ID}/${docId}`;

/**
 * Map-backed StorageAdapter with per-key read-failure injection and call
 * recording, so tests can assert both WHAT ends up in storage and WHICH
 * keys were touched to get there.
 */
class FakeStorageAdapter implements StorageAdapter<unknown> {
  public readonly data = new Map<string, unknown>();
  public readonly failingGetKeys = new Set<string>();
  public readonly failingSetKeys = new Set<string>();
  public readonly failingRemoveKeys = new Set<string>();
  public readonly getItemCalls: string[] = [];
  public readonly setItemCalls: string[] = [];
  public readonly removeItemCalls: string[] = [];
  public delayMs = 0;

  public async getItem(key: string): Promise<unknown> {
    this.getItemCalls.push(key);
    await this.delay();
    if (this.failingGetKeys.has(key)) {
      throw new Error(`injected read failure for '${key}'`);
    }
    return this.data.has(key) ? this.data.get(key) : null;
  }

  public async setItem(key: string, value: unknown): Promise<void> {
    this.setItemCalls.push(key);
    await this.delay();
    if (this.failingSetKeys.has(key)) {
      throw new Error(`injected write failure for '${key}'`);
    }
    this.data.set(key, value);
  }

  public async removeItem(key: string): Promise<void> {
    this.removeItemCalls.push(key);
    await this.delay();
    if (this.failingRemoveKeys.has(key)) {
      throw new Error(`injected remove failure for '${key}'`);
    }
    this.data.delete(key);
  }

  public resetCalls(): void {
    this.getItemCalls.length = 0;
    this.setItemCalls.length = 0;
    this.removeItemCalls.length = 0;
  }

  public docKeys(): string[] {
    return [...this.data.keys()]
      .filter(key => key.startsWith(`${COLLECTION_ID}/`))
      .sort();
  }

  private async delay(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }
  }
}

/** Collects every emission until the observable completes. */
const emissionsOf = async <T>(observable: Observable<T>): Promise<T[]> =>
  lastValueFrom(observable.pipe(toArray()));

describe('storage:stores:collection-store', () => {
  const docA: TestDoc = { id: 'a', value: 1 };
  const docB: TestDoc = { id: 'b', value: 2 };
  const docC: TestDoc = { id: 'c', value: 3 };

  let adapter: FakeStorageAdapter;
  let store: CollectionStore<TestDoc>;

  const createStore = (): CollectionStore<TestDoc> =>
    new CollectionStore<TestDoc>({
      collectionId: COLLECTION_ID,
      storage: adapter,
      logger: dummyLogger,
      computeDocId,
    });

  beforeEach(() => {
    adapter = new FakeStorageAdapter();
    store = createStore();
  });

  describe('fresh collection', () => {
    it('getAll completes without emitting when nothing is stored', async () => {
      expect(await emissionsOf(store.getAll())).toEqual([]);
    });

    it('setAll then getAll round-trips; docs land under per-doc keys and the index at the root key', async () => {
      expect(await emissionsOf(store.setAll([docA, docB]))).toEqual([
        undefined,
      ]);
      expect(await emissionsOf(store.getAll())).toEqual([[docA, docB]]);
      expect(adapter.data.get(docKey('a'))).toEqual(docA);
      expect(adapter.data.get(docKey('b'))).toEqual(docB);
      expect(adapter.data.get(COLLECTION_ID)).toEqual({
        docIds: ['a', 'b'],
        version: 1,
      });
    });

    it('setAll removes documents that are no longer part of the collection', async () => {
      await emissionsOf(store.setAll([docA, docB]));
      await emissionsOf(store.setAll([docB]));
      expect(adapter.docKeys()).toEqual([docKey('b')]);
      expect(adapter.data.get(COLLECTION_ID)).toEqual({
        docIds: ['b'],
        version: 1,
      });
      expect(await emissionsOf(store.getAll())).toEqual([[docB]]);
    });
  });

  describe('get (keyed read)', () => {
    it('emits the document stored under that id', async () => {
      await emissionsOf(store.upsert(docA));
      await emissionsOf(store.upsert(docB));
      expect(await emissionsOf(store.get('b'))).toEqual([docB]);
    });

    it('reads only the index and that document, not every document', async () => {
      await emissionsOf(store.upsert(docA));
      await emissionsOf(store.upsert(docB));
      await emissionsOf(store.upsert(docC));
      const fresh = createStore();
      adapter.getItemCalls.length = 0;

      await emissionsOf(fresh.get('b'));

      // The whole point of per-document keys: one entity's restore must not
      // read the other entities' payloads.
      expect(adapter.getItemCalls).toEqual([COLLECTION_ID, docKey('b')]);
      expect(adapter.getItemCalls).not.toContain(docKey('a'));
      expect(adapter.getItemCalls).not.toContain(docKey('c'));
    });

    it('completes without emitting for an id the index does not hold, reading no document key', async () => {
      await emissionsOf(store.upsert(docA));
      const fresh = createStore();
      adapter.getItemCalls.length = 0;

      expect(await emissionsOf(fresh.get('missing'))).toEqual([]);
      expect(adapter.getItemCalls).toEqual([COLLECTION_ID]);
    });

    it('completes without emitting when the document itself is unreadable', async () => {
      await emissionsOf(store.upsert(docA));
      await emissionsOf(store.upsert(docB));
      const fresh = createStore();
      adapter.failingGetKeys.add(docKey('b'));

      // Degrades alone, matching getAll: a sibling stays readable.
      expect(await emissionsOf(fresh.get('b'))).toEqual([]);
      expect(await emissionsOf(fresh.get('a'))).toEqual([docA]);
    });
  });

  describe('upsert', () => {
    it('inserts a new document: writes its key and appends its id to the index', async () => {
      await emissionsOf(store.setAll([docA, docB]));
      adapter.resetCalls();

      expect(await emissionsOf(store.upsert(docC))).toEqual([undefined]);
      expect(adapter.setItemCalls).toEqual([docKey('c'), COLLECTION_ID]);
      expect(adapter.data.get(docKey('c'))).toEqual(docC);
      expect(adapter.data.get(COLLECTION_ID)).toEqual({
        docIds: ['a', 'b', 'c'],
        version: 1,
      });
    });

    it('replaces an existing document without rewriting other doc keys or the index', async () => {
      await emissionsOf(store.setAll([docA, docB, docC]));
      adapter.resetCalls();

      const replacement: TestDoc = { id: 'b', value: 99 };
      await emissionsOf(store.upsert(replacement));

      expect(adapter.setItemCalls).toEqual([docKey('b')]);
      expect(adapter.removeItemCalls).toEqual([]);
      expect(adapter.data.get(docKey('b'))).toEqual(replacement);
      expect(adapter.data.get(docKey('a'))).toEqual(docA);
      expect(adapter.data.get(docKey('c'))).toEqual(docC);
    });

    it('preserves index order when replacing a document', async () => {
      await emissionsOf(store.setAll([docA, docB, docC]));
      const replacement: TestDoc = { id: 'a', value: 42 };
      await emissionsOf(store.upsert(replacement));

      expect(
        (adapter.data.get(COLLECTION_ID) as CollectionIndex).docIds,
      ).toEqual(['a', 'b', 'c']);
      expect(await emissionsOf(store.getAll())).toEqual([
        [replacement, docB, docC],
      ]);
    });
  });

  describe('removeWhere', () => {
    it('removes matching docs and their index entries, leaving others untouched', async () => {
      await emissionsOf(store.setAll([docA, docB, docC]));
      adapter.resetCalls();

      expect(
        await emissionsOf(store.removeWhere(document => document.value >= 2)),
      ).toEqual([undefined]);

      expect(adapter.removeItemCalls).toEqual([docKey('b'), docKey('c')]);
      expect(adapter.docKeys()).toEqual([docKey('a')]);
      expect(adapter.data.get(COLLECTION_ID)).toEqual({
        docIds: ['a'],
        version: 1,
      });
      expect(await emissionsOf(store.getAll())).toEqual([[docA]]);
    });

    it('is a no-op when nothing matches: no removals and no index write', async () => {
      await emissionsOf(store.setAll([docA, docB]));
      adapter.resetCalls();

      expect(await emissionsOf(store.removeWhere(() => false))).toEqual([
        undefined,
      ]);

      expect(adapter.removeItemCalls).toEqual([]);
      expect(adapter.setItemCalls).toEqual([]);
      expect(await emissionsOf(store.getAll())).toEqual([[docA, docB]]);
    });
  });

  describe('clear', () => {
    it('removes all doc keys and writes an empty index at the root key (migration marker stays, R2)', async () => {
      await emissionsOf(store.setAll([docA, docB]));

      expect(await emissionsOf(store.clear())).toEqual([undefined]);

      expect(adapter.docKeys()).toEqual([]);
      // Root key must hold an empty index, NOT be deleted: its presence is
      // what prevents legacy-migration detection from re-triggering.
      expect(adapter.data.get(COLLECTION_ID)).toEqual({
        docIds: [],
        version: 1,
      });
      expect(await emissionsOf(store.getAll())).toEqual([]);
    });
  });

  describe('legacy migration', () => {
    it('splits a legacy array into per-doc keys, writing the index last', async () => {
      adapter.data.set(COLLECTION_ID, [docA, docB]);

      expect(await emissionsOf(store.getAll())).toEqual([[docA, docB]]);

      // Index written last: it atomically completes the migration.
      expect(adapter.setItemCalls).toEqual([
        docKey('a'),
        docKey('b'),
        COLLECTION_ID,
      ]);
      expect(adapter.data.get(docKey('a'))).toEqual(docA);
      expect(adapter.data.get(docKey('b'))).toEqual(docB);
      expect(adapter.data.get(COLLECTION_ID)).toEqual({
        docIds: ['a', 'b'],
        version: 1,
      });

      // Subsequent reads (same and fresh instance) see the migrated layout.
      expect(await emissionsOf(store.getAll())).toEqual([[docA, docB]]);
      expect(await emissionsOf(createStore().getAll())).toEqual([[docA, docB]]);
    });

    it('does not overwrite a pre-existing per-doc key holding newer data, but still indexes it (R1/R2)', async () => {
      const newerA: TestDoc = { id: 'a', value: 1000 };
      adapter.data.set(COLLECTION_ID, [docA, docB]);
      adapter.data.set(docKey('a'), newerA);

      expect(await emissionsOf(store.getAll())).toEqual([[newerA, docB]]);

      expect(adapter.setItemCalls).not.toContain(docKey('a'));
      expect(adapter.data.get(docKey('a'))).toEqual(newerA);
      expect(adapter.data.get(COLLECTION_ID)).toEqual({
        docIds: ['a', 'b'],
        version: 1,
      });
    });

    it('treats an unrecognized root value as an empty collection without writing', async () => {
      adapter.data.set(COLLECTION_ID, 'not-an-array-and-not-an-index');

      expect(await emissionsOf(store.getAll())).toEqual([]);

      expect(adapter.setItemCalls).toEqual([]);
      expect(adapter.data.get(COLLECTION_ID)).toBe(
        'not-an-array-and-not-an-index',
      );
    });

    it('re-runs an interrupted migration on the next read without rewriting the already-split doc keys', async () => {
      adapter.data.set(COLLECTION_ID, [docA, docB]);
      adapter.failingSetKeys.add(COLLECTION_ID);

      await expect(emissionsOf(store.getAll())).rejects.toThrow(
        /injected write failure/,
      );
      // The legacy array is still in place: it doubles as the
      // migration-incomplete marker.
      expect(adapter.data.get(COLLECTION_ID)).toEqual([docA, docB]);

      adapter.failingSetKeys.delete(COLLECTION_ID);
      adapter.resetCalls();

      expect(await emissionsOf(store.getAll())).toEqual([[docA, docB]]);
      expect(adapter.setItemCalls).toEqual([COLLECTION_ID]);
      expect(adapter.data.get(COLLECTION_ID)).toEqual({
        docIds: ['a', 'b'],
        version: 1,
      });
    });

    it('a document write failing mid-migration leaves the legacy array intact, and the retry skips already-split keys', async () => {
      // Documents-first/index-last exists mainly for this case: a crash between
      // DOCUMENT writes. Losing the legacy array here would strand every
      // not-yet-split wallet's state with nothing left to migrate from.
      adapter.data.set(COLLECTION_ID, [docA, docB, docC]);
      adapter.failingSetKeys.add(docKey('b'));

      await expect(emissionsOf(store.getAll())).rejects.toThrow(
        /injected write failure/,
      );

      // No index write happened, so nothing marks the migration complete.
      expect(adapter.data.get(COLLECTION_ID)).toEqual([docA, docB, docC]);

      adapter.failingSetKeys.delete(docKey('b'));
      adapter.resetCalls();

      expect(await emissionsOf(store.getAll())).toEqual([[docA, docB, docC]]);
      expect(adapter.data.get(COLLECTION_ID)).toEqual({
        docIds: ['a', 'b', 'c'],
        version: 1,
      } satisfies CollectionIndex);
      // 'a' landed before the failure; skip-existing means the retry does not
      // rewrite it, so a newer per-doc value could not be clobbered.
      expect(adapter.setItemCalls).not.toContain(docKey('a'));
    });

    it('deduplicates docIds in the legacy array: first occurrence wins', async () => {
      const duplicateA: TestDoc = { id: 'a', value: 777 };
      adapter.data.set(COLLECTION_ID, [docA, docB, duplicateA]);

      expect(await emissionsOf(store.getAll())).toEqual([[docA, docB]]);

      expect(adapter.data.get(docKey('a'))).toEqual(docA);
      expect(adapter.data.get(COLLECTION_ID)).toEqual({
        docIds: ['a', 'b'],
        version: 1,
      });
    });
  });

  describe('read-failure isolation (R4/R10)', () => {
    it('getAll skips a single unreadable document and returns the rest', async () => {
      adapter.data.set(COLLECTION_ID, {
        docIds: ['a', 'b', 'c'],
        version: 1,
      } satisfies CollectionIndex);
      adapter.data.set(docKey('a'), docA);
      adapter.data.set(docKey('b'), docB);
      adapter.data.set(docKey('c'), docC);
      adapter.failingGetKeys.add(docKey('b'));

      expect(await emissionsOf(store.getAll())).toEqual([[docA, docC]]);
    });

    it('getAll propagates a root read failure instead of reporting an empty collection', async () => {
      adapter.failingGetKeys.add(COLLECTION_ID);

      await expect(emissionsOf(store.getAll())).rejects.toThrow(
        /injected read failure/,
      );

      expect(adapter.setItemCalls).toEqual([]);
      expect(adapter.removeItemCalls).toEqual([]);
    });

    it('does not let a transient root read failure poison a later upsert: siblings stay indexed', async () => {
      adapter.data.set(COLLECTION_ID, {
        docIds: ['a', 'b'],
        version: 1,
      } satisfies CollectionIndex);
      adapter.data.set(docKey('a'), docA);
      adapter.data.set(docKey('b'), docB);
      adapter.failingGetKeys.add(COLLECTION_ID);

      await expect(emissionsOf(store.getAll())).rejects.toThrow(
        /injected read failure/,
      );

      adapter.failingGetKeys.delete(COLLECTION_ID);
      await emissionsOf(store.upsert(docC));

      expect(
        (adapter.data.get(COLLECTION_ID) as CollectionIndex).docIds,
      ).toEqual(['a', 'b', 'c']);
      expect(await emissionsOf(store.getAll())).toEqual([[docA, docB, docC]]);
    });

    it('does not let a transient root read failure skip the legacy migration on a later upsert', async () => {
      adapter.data.set(COLLECTION_ID, [docA, docB]);
      adapter.failingGetKeys.add(COLLECTION_ID);

      await expect(emissionsOf(store.getAll())).rejects.toThrow(
        /injected read failure/,
      );

      adapter.failingGetKeys.delete(COLLECTION_ID);
      await emissionsOf(store.upsert(docC));

      expect(
        (adapter.data.get(COLLECTION_ID) as CollectionIndex).docIds,
      ).toEqual(['a', 'b', 'c']);
      expect(adapter.docKeys()).toEqual([
        docKey('a'),
        docKey('b'),
        docKey('c'),
      ]);
    });

    it('clear propagates a root read failure, so a retry still wipes the real collection', async () => {
      adapter.data.set(COLLECTION_ID, {
        docIds: ['a', 'b'],
        version: 1,
      } satisfies CollectionIndex);
      adapter.data.set(docKey('a'), docA);
      adapter.data.set(docKey('b'), docB);
      adapter.failingGetKeys.add(COLLECTION_ID);
      adapter.resetCalls();

      await expect(emissionsOf(store.clear())).rejects.toThrow(
        /injected read failure/,
      );

      expect(adapter.removeItemCalls).toEqual([]);
      expect(
        (adapter.data.get(COLLECTION_ID) as CollectionIndex).docIds,
      ).toEqual(['a', 'b']);

      adapter.failingGetKeys.delete(COLLECTION_ID);
      await emissionsOf(store.clear());

      expect(adapter.removeItemCalls).toEqual([docKey('a'), docKey('b')]);
      expect(adapter.data.get(COLLECTION_ID)).toEqual({
        docIds: [],
        version: 1,
      });
    });

    it('a failed index write during clear drops the caches so the next operation re-reads storage', async () => {
      await emissionsOf(store.setAll([docA, docB]));
      adapter.failingSetKeys.add(COLLECTION_ID);

      await expect(emissionsOf(store.clear())).rejects.toThrow(
        /injected write failure/,
      );

      adapter.failingSetKeys.delete(COLLECTION_ID);
      await emissionsOf(store.upsert(docC));

      // The index is rebuilt from a fresh read of the OLD stored index, not
      // from the partial in-memory state clear() left behind.
      expect(
        (adapter.data.get(COLLECTION_ID) as CollectionIndex).docIds,
      ).toEqual(['a', 'b', 'c']);
    });

    it('a failed document write during upsert drops the caches instead of trusting partial state', async () => {
      await emissionsOf(store.setAll([docA]));
      adapter.failingSetKeys.add(docKey('b'));

      await expect(emissionsOf(store.upsert(docB))).rejects.toThrow(
        /injected write failure/,
      );

      adapter.failingSetKeys.delete(docKey('b'));
      expect(await emissionsOf(store.getAll())).toEqual([[docA]]);
      expect(
        (adapter.data.get(COLLECTION_ID) as CollectionIndex).docIds,
      ).toEqual(['a']);
    });

    it('a failed stale-key removal during setAll leaves the old collection readable and a retried setAll converges', async () => {
      await emissionsOf(store.setAll([docA, docB]));
      adapter.failingRemoveKeys.add(docKey('a'));

      await expect(emissionsOf(store.setAll([docB]))).rejects.toThrow(
        /injected remove failure/,
      );
      expect(await emissionsOf(store.getAll())).toEqual([[docA, docB]]);

      adapter.failingRemoveKeys.delete(docKey('a'));
      await emissionsOf(store.setAll([docB]));

      expect(adapter.docKeys()).toEqual([docKey('b')]);
      expect(adapter.data.get(COLLECTION_ID)).toEqual({
        docIds: ['b'],
        version: 1,
      });
    });

    it('removeWhere fails when a document it must judge cannot be read', async () => {
      adapter.data.set(COLLECTION_ID, {
        docIds: ['a', 'b', 'c'],
        version: 1,
      } satisfies CollectionIndex);
      adapter.data.set(docKey('a'), docA);
      adapter.data.set(docKey('b'), docB);
      adapter.data.set(docKey('c'), docC);
      // docB matches the predicate below but is unreadable. Removing what can
      // be read and reporting success would tell a caller wiping state that
      // docB is gone while it is still on disk to be restored.
      adapter.failingGetKeys.add(docKey('b'));
      adapter.resetCalls();

      await expect(
        emissionsOf(store.removeWhere(document => document.value >= 2)),
      ).rejects.toThrow(/could not be read/);

      // Nothing partially removed: the failure precedes any deletion.
      expect(adapter.removeItemCalls).toEqual([]);
      expect(adapter.setItemCalls).toEqual([]);
      expect(
        (adapter.data.get(COLLECTION_ID) as CollectionIndex).docIds,
      ).toEqual(['a', 'b', 'c']);
    });

    it('removeWhere succeeds once the unreadable document can be read again', async () => {
      adapter.data.set(COLLECTION_ID, {
        docIds: ['a', 'b', 'c'],
        version: 1,
      } satisfies CollectionIndex);
      adapter.data.set(docKey('a'), docA);
      adapter.data.set(docKey('b'), docB);
      adapter.data.set(docKey('c'), docC);
      adapter.failingGetKeys.add(docKey('b'));
      await expect(
        emissionsOf(store.removeWhere(document => document.value >= 2)),
      ).rejects.toThrow(/could not be read/);

      // A transient read failure must not leave the store refusing removals.
      adapter.failingGetKeys.delete(docKey('b'));
      await emissionsOf(store.removeWhere(document => document.value >= 2));

      expect(await emissionsOf(store.getAll())).toEqual([[docA]]);
    });

    it('removeWhere propagates a root read failure instead of silently removing nothing', async () => {
      // Callers treat this as a wipe; reporting success without wiping would
      // let them proceed as though old state were gone.
      adapter.data.set(COLLECTION_ID, {
        docIds: ['a', 'b'],
        version: 1,
      } satisfies CollectionIndex);
      adapter.data.set(docKey('a'), docA);
      adapter.data.set(docKey('b'), docB);
      adapter.failingGetKeys.add(COLLECTION_ID);
      adapter.resetCalls();

      await expect(
        emissionsOf(store.removeWhere(document => document.id === 'a')),
      ).rejects.toThrow(/injected read failure/);

      expect(adapter.removeItemCalls).toEqual([]);
      expect(adapter.setItemCalls).toEqual([]);
      expect(adapter.docKeys()).toEqual([docKey('a'), docKey('b')]);
    });

    it('upsert propagates a root read failure instead of orphaning its siblings', async () => {
      // The adapter contract makes absence (null) and failure (throw)
      // distinguishable; without that the store would rebuild the index from a
      // wrongly-empty list and strand every document it did not write.
      adapter.data.set(COLLECTION_ID, {
        docIds: ['a'],
        version: 1,
      } satisfies CollectionIndex);
      adapter.data.set(docKey('a'), docA);
      adapter.failingGetKeys.add(COLLECTION_ID);

      await expect(emissionsOf(store.upsert(docC))).rejects.toThrow(
        /injected read failure/,
      );

      expect(
        (adapter.data.get(COLLECTION_ID) as CollectionIndex).docIds,
      ).toEqual(['a']);
    });

    it('a failed per-document read during migration aborts instead of overwriting newer data with the legacy snapshot', async () => {
      const newerA: TestDoc = { id: 'a', value: 99 };
      adapter.data.set(COLLECTION_ID, [docA]);
      adapter.data.set(docKey('a'), newerA);
      adapter.failingGetKeys.add(docKey('a'));

      await expect(emissionsOf(store.getAll())).rejects.toThrow(
        /injected read failure/,
      );

      expect(adapter.data.get(docKey('a'))).toEqual(newerA);
      // The legacy array survives, so the migration re-runs once reads recover.
      expect(adapter.data.get(COLLECTION_ID)).toEqual([docA]);
    });
  });

  describe('ordering', () => {
    it('getAll returns documents in index order, not storage insertion order', async () => {
      adapter.data.set(docKey('a'), docA);
      adapter.data.set(docKey('b'), docB);
      adapter.data.set(docKey('c'), docC);
      adapter.data.set(COLLECTION_ID, {
        docIds: ['c', 'a', 'b'],
        version: 1,
      } satisfies CollectionIndex);

      expect(await emissionsOf(store.getAll())).toEqual([[docC, docA, docB]]);
    });
  });

  describe('observeAll (R9)', () => {
    it('emits the initial snapshot, then updates after each mutation, deduplicating identical content', async () => {
      const emissions: TestDoc[][] = [];
      const subscription = store
        .observeAll()
        .subscribe(documents => emissions.push(documents));

      // Queued no-op read guarantees observeAll's initial snapshot was
      // delivered before the first mutation below.
      await emissionsOf(store.getAll());
      expect(emissions).toEqual([[]]);

      const replacementB: TestDoc = { id: 'b', value: 99 };
      await emissionsOf(store.setAll([docA, docB]));
      await emissionsOf(store.upsert(replacementB));
      // Identical content: distinctUntilChanged must suppress the emission.
      await emissionsOf(store.upsert({ ...replacementB }));
      await emissionsOf(store.removeWhere(document => document.id === 'a'));
      await emissionsOf(store.clear());
      subscription.unsubscribe();

      expect(emissions).toEqual([
        [],
        [docA, docB],
        [docA, replacementB],
        [replacementB],
        [],
      ]);
    });

    it('emits the stored collection to a subscriber of a pre-populated store', async () => {
      adapter.data.set(COLLECTION_ID, [docA]);

      const emissions: TestDoc[][] = [];
      const subscription = store
        .observeAll()
        .subscribe(documents => emissions.push(documents));
      await emissionsOf(store.getAll());
      subscription.unsubscribe();

      expect(emissions).toEqual([[docA]]);
    });
  });

  describe('operation serialization (R3)', () => {
    it('keeps index and doc keys consistent for concurrent setAll and upsert', async () => {
      adapter.delayMs = 1;

      await Promise.all([
        emissionsOf(store.setAll([docA, docB])),
        emissionsOf(store.upsert(docC)),
      ]);

      expect(adapter.data.get(COLLECTION_ID)).toEqual({
        docIds: ['a', 'b', 'c'],
        version: 1,
      });
      expect(adapter.docKeys()).toEqual([
        docKey('a'),
        docKey('b'),
        docKey('c'),
      ]);
      expect(await emissionsOf(store.getAll())).toEqual([[docA, docB, docC]]);
    });

    it('keeps index and doc keys consistent for two concurrent setAll calls', async () => {
      adapter.delayMs = 1;

      await Promise.all([
        emissionsOf(store.setAll([docA, docB])),
        emissionsOf(store.setAll([docB, docC])),
      ]);

      const index = adapter.data.get(COLLECTION_ID) as CollectionIndex;
      expect(index.docIds).toEqual(['b', 'c']);
      expect(adapter.docKeys()).toEqual([docKey('b'), docKey('c')]);
      expect(await emissionsOf(store.getAll())).toEqual([[docB, docC]]);
    });
  });
});
