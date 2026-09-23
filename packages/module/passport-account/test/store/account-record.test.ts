import {
  RecordCorruptedError,
  RecordUnreadableError,
} from '@lace-contract/passport';
import { EMPTY, firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  createAccountRecordStore,
  toAccountRecords,
} from '../../src/store/account-record';
import {
  isSealedRecord,
  openRecord,
  sealRecord,
} from '../../src/store/envelope';

import type { PassportAccountRecord } from '../../src/store/account-record';
import type { SealedRecord } from '../../src/store/envelope';
import type { KeyValueStorageFactory } from '@lace-contract/module';

const record: PassportAccountRecord = {
  address: 'ac'.repeat(32),
  bindingVersion: '0.1.0-lace.1',
  localUseCounter: '3',
};

const importAesKey = async () =>
  crypto.subtle.importKey(
    'raw',
    new Uint8Array(32).fill(7),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

const createStorageStub = (storedValue?: unknown) => {
  const storage = {
    getValues: vi.fn(() =>
      storedValue === undefined ? EMPTY : of([storedValue]),
    ),
    setValue: vi.fn(() => of(void 0)),
  };
  return {
    storage,
    createKeyValueStorage: vi.fn(
      () => storage,
    ) as unknown as KeyValueStorageFactory,
  };
};

describe('createAccountRecordStore', () => {
  describe('without a storage key provider', () => {
    it('writes and reads the record in plaintext', async () => {
      const { storage, createKeyValueStorage } = createStorageStub(record);
      const store = createAccountRecordStore(createKeyValueStorage);

      await firstValueFrom(store.write(record), { defaultValue: undefined });
      expect(storage.setValue).toHaveBeenCalledExactlyOnceWith(
        'account',
        record,
      );
      await expect(firstValueFrom(store.read())).resolves.toEqual(record);
    });

    it('reads undefined when nothing is stored', async () => {
      const { createKeyValueStorage } = createStorageStub();
      const store = createAccountRecordStore(createKeyValueStorage);
      await expect(firstValueFrom(store.read())).resolves.toBeUndefined();
    });

    it('reads a sealed record as undefined', async () => {
      const sealed = await sealRecord(await importAesKey(), record);
      const { createKeyValueStorage } = createStorageStub(sealed);
      const store = createAccountRecordStore(createKeyValueStorage);
      await expect(firstValueFrom(store.read())).resolves.toBeUndefined();
    });

    it('reports presence without opening: sealed, plain, and absent', async () => {
      const sealed = await sealRecord(await importAesKey(), record);
      const sealedStore = createAccountRecordStore(
        createStorageStub(sealed).createKeyValueStorage,
      );
      const plainStore = createAccountRecordStore(
        createStorageStub(record).createKeyValueStorage,
      );
      const emptyStore = createAccountRecordStore(
        createStorageStub().createKeyValueStorage,
      );
      await expect(firstValueFrom(sealedStore.exists())).resolves.toBe(true);
      await expect(firstValueFrom(plainStore.exists())).resolves.toBe(true);
      await expect(firstValueFrom(emptyStore.exists())).resolves.toBe(false);
    });

    it('errors on a sealed record under onSealedWithoutKey error', async () => {
      const sealed = await sealRecord(await importAesKey(), record);
      const { createKeyValueStorage } = createStorageStub(sealed);
      const store = createAccountRecordStore(createKeyValueStorage, undefined, {
        onSealedWithoutKey: 'error',
      });
      await expect(firstValueFrom(store.read())).rejects.toThrow(
        RecordUnreadableError,
      );
    });
  });

  describe('with a storage key provider', () => {
    it('seals the record at rest and opens it back', async () => {
      const key = await importAesKey();
      const { storage, createKeyValueStorage } = createStorageStub();
      const store = createAccountRecordStore(
        createKeyValueStorage,
        async () => key,
      );

      await firstValueFrom(store.write(record), { defaultValue: undefined });

      const [, sealed] = storage.setValue.mock.calls[0] as unknown as [
        string,
        SealedRecord,
      ];
      expect(isSealedRecord(sealed)).toBe(true);
      await expect(openRecord(key, sealed)).resolves.toEqual(record);
    });

    it('draws a fresh IV for every persisted write', async () => {
      const key = await importAesKey();
      const { storage, createKeyValueStorage } = createStorageStub();
      const store = createAccountRecordStore(
        createKeyValueStorage,
        async () => key,
      );

      await firstValueFrom(store.write(record), { defaultValue: undefined });
      await firstValueFrom(store.write(record), { defaultValue: undefined });

      const [[, first], [, second]] = storage.setValue.mock
        .calls as unknown as [[string, SealedRecord], [string, SealedRecord]];
      expect(second.iv).not.toBe(first.iv);
    });

    it('reads the record back through the sealed envelope', async () => {
      const key = await importAesKey();
      const sealed = await sealRecord(key, record);
      const { createKeyValueStorage } = createStorageStub(sealed);
      const store = createAccountRecordStore(
        createKeyValueStorage,
        async () => key,
      );
      await expect(firstValueFrom(store.read())).resolves.toEqual(record);
    });

    it('reads undefined when nothing is stored', async () => {
      const key = await importAesKey();
      const { createKeyValueStorage } = createStorageStub();
      const store = createAccountRecordStore(
        createKeyValueStorage,
        async () => key,
      );
      await expect(firstValueFrom(store.read())).resolves.toBeUndefined();
    });

    it('reads a plaintext record as undefined', async () => {
      const key = await importAesKey();
      const { createKeyValueStorage } = createStorageStub(record);
      const store = createAccountRecordStore(
        createKeyValueStorage,
        async () => key,
      );
      await expect(firstValueFrom(store.read())).resolves.toBeUndefined();
    });

    it('errors with RecordCorruptedError when the envelope does not open', async () => {
      const key = await importAesKey();
      const sealed = await sealRecord(key, record);
      const tampered = {
        ...sealed,
        ciphertext:
          (sealed.ciphertext.startsWith('0') ? '1' : '0') +
          sealed.ciphertext.slice(1),
      };
      const { createKeyValueStorage } = createStorageStub(tampered);
      const store = createAccountRecordStore(
        createKeyValueStorage,
        async () => key,
      );
      await expect(firstValueFrom(store.read())).rejects.toThrow(
        RecordCorruptedError,
      );
    });
  });
});

describe('toAccountRecords', () => {
  it('reads the stored record, or undefined when nothing is stored', async () => {
    const stored = toAccountRecords(
      createAccountRecordStore(createStorageStub(record).createKeyValueStorage),
    );
    const empty = toAccountRecords(
      createAccountRecordStore(createStorageStub().createKeyValueStorage),
    );

    await expect(stored.read()).resolves.toEqual(record);
    await expect(empty.read()).resolves.toBeUndefined();
  });

  it('reports presence as a boolean', async () => {
    const stored = toAccountRecords(
      createAccountRecordStore(createStorageStub(record).createKeyValueStorage),
    );
    const empty = toAccountRecords(
      createAccountRecordStore(createStorageStub().createKeyValueStorage),
    );

    await expect(stored.exists()).resolves.toBe(true);
    await expect(empty.exists()).resolves.toBe(false);
  });

  it('writes the record and resolves undefined', async () => {
    const { storage, createKeyValueStorage } = createStorageStub();
    const records = toAccountRecords(
      createAccountRecordStore(createKeyValueStorage),
    );

    await expect(records.write(record)).resolves.toBeUndefined();
    expect(storage.setValue).toHaveBeenCalledExactlyOnceWith('account', record);
  });

  it('resolves a write even when the storage completes without emitting', async () => {
    const { storage, createKeyValueStorage } = createStorageStub();
    storage.setValue.mockReturnValue(EMPTY);
    const records = toAccountRecords(
      createAccountRecordStore(createKeyValueStorage),
    );

    await expect(records.write(record)).resolves.toBeUndefined();
  });

  it('rejects with the failure the store reports', async () => {
    const sealed = await sealRecord(await importAesKey(), record);
    const records = toAccountRecords(
      createAccountRecordStore(
        createStorageStub(sealed).createKeyValueStorage,
        undefined,
        { onSealedWithoutKey: 'error' },
      ),
    );

    await expect(records.read()).rejects.toThrow(RecordUnreadableError);
  });
});
