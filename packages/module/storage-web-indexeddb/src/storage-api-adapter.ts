import { Serializable } from '@lace-lib/util-store';

import type { StorageAdapter } from '@lace-contract/storage';

const DB_NAME = 'lace-storage';
const OBJECT_STORE_NAME = 'key-value';

const awaitRequest = async <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed'));
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
  });

// 'complete' (not request 'success') is IndexedDB's durable-write signal;
// a transaction can still abort (e.g. quota exceeded) after every request succeeded
const awaitTransaction = async (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    };
    transaction.oncomplete = () => {
      resolve();
    };
  });

const openDatabase = async () => {
  const request = indexedDB.open(DB_NAME);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(OBJECT_STORE_NAME);
  };
  return awaitRequest(request);
};

const getDatabase = (() => {
  let database: Promise<IDBDatabase> | undefined;
  return async () =>
    (database ??= openDatabase().catch((error: unknown) => {
      // Drop the memo on failure. A cached rejection fails every later read for
      // the rest of the session, leaving no path back to a working database.
      database = undefined;
      throw error;
    }));
})();

export const storageApi: StorageAdapter<unknown> = {
  getItem: async key => {
    const db = await getDatabase();
    const value = await awaitRequest<unknown>(
      db
        .transaction(OBJECT_STORE_NAME, 'readonly')
        .objectStore(OBJECT_STORE_NAME)
        .get(key),
    );
    return Serializable.from(value as Serializable<unknown>) ?? null;
  },
  setItem: async (key, value) => {
    const db = await getDatabase();
    const transaction = db.transaction(OBJECT_STORE_NAME, 'readwrite');
    transaction.objectStore(OBJECT_STORE_NAME).put(Serializable.to(value), key);
    return awaitTransaction(transaction);
  },
  removeItem: async key => {
    const db = await getDatabase();
    const transaction = db.transaction(OBJECT_STORE_NAME, 'readwrite');
    transaction.objectStore(OBJECT_STORE_NAME).delete(key);
    return awaitTransaction(transaction);
  },
};
