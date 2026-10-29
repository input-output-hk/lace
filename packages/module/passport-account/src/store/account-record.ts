import { RecordUnreadableError } from '@lace-contract/passport';
import {
  concatMap,
  defaultIfEmpty,
  defer,
  firstValueFrom,
  map,
  mergeMap,
} from 'rxjs';

import { isSealedRecord, openRecord, sealRecord } from './envelope';

import type { SealedRecord } from './envelope';
import type {
  AccountRecords,
  PassportAccountRecord,
  RecordPresence,
} from '../flows/types';
import type { KeyValueStorageFactory } from '@lace-contract/module';
import type { Observable } from 'rxjs';

export type { PassportAccountRecord, RecordPresence } from '../flows/types';

const COLLECTION_ID = 'passport-account';
const ACCOUNT_RECORD_KEY = 'account';

/** Provides the AES-GCM key that seals the account record at rest. */
export type StorageKeyProvider = () => Promise<CryptoKey>;

/** How a read without a key provider treats a sealed record it finds. */
export type SealedWithoutKeyOptions = {
  onSealedWithoutKey?: 'error' | 'skip';
};

/**
 * Reads and writes the persisted account record. Deliberately a minimal
 * seam: consumers depend on this interface only and never see whether the
 * record is sealed at rest.
 */
export type AccountRecordStore = {
  /**
   * Emits the stored record, or undefined when none is stored. Errors
   * with RecordCorruptedError when a sealed record fails to open, and,
   * under `onSealedWithoutKey: 'error'`, with RecordUnreadableError when
   * a sealed record is found but no storage key is configured.
   */
  read: () => Observable<PassportAccountRecord | undefined>;
  /**
   * Stores the record. Mirrors the storage contract: emits undefined and
   * completes, or completes without emitting if the storage is destroyed.
   */
  write: (record: PassportAccountRecord) => Observable<void>;
  /**
   * Emits what is stored, sealed or not, without opening it: absent,
   * pending while a creation is unfinished, or complete. Presence needs
   * no storage key and no ceremony; a sealed record carries the pending
   * mark on its envelope.
   */
  presence: () => Observable<RecordPresence>;
};

/**
 * An {@link AccountRecordStore} over the platform key-value storage,
 * namespaced under its own collection. With a `keyProvider` the record is
 * sealed at rest and only sealed envelopes are readable. What a sealed
 * record reads as without a `keyProvider` is the caller's choice:
 * 'skip' (the default) reads it as undefined, for the ceremony-free
 * restore peek that cannot open it by design; 'error' raises
 * RecordUnreadableError, for the flows where a missing storage key is a
 * persistence misconfiguration that must not look like an absent
 * account. Without a `keyProvider` (the dev authoriser) the record
 * persists in plaintext, which holds no secret once the account is
 * complete; while a creation is unfinished it holds the contract's
 * maintenance authority key (see {@link PassportAccountRecord}), so the
 * dev authoriser is for development and tests only.
 */
export const createAccountRecordStore = (
  createKeyValueStorage: KeyValueStorageFactory,
  keyProvider?: StorageKeyProvider,
  { onSealedWithoutKey = 'skip' }: SealedWithoutKeyOptions = {},
): AccountRecordStore => {
  const storage = createKeyValueStorage<
    typeof ACCOUNT_RECORD_KEY,
    PassportAccountRecord | SealedRecord
  >({ collectionId: COLLECTION_ID });

  const open = async (
    keyOf: StorageKeyProvider,
    value: PassportAccountRecord | SealedRecord | undefined,
  ): Promise<PassportAccountRecord | undefined> =>
    isSealedRecord(value)
      ? openRecord<PassportAccountRecord>(await keyOf(), value)
      : undefined;

  const stored = () =>
    storage.getValues([ACCOUNT_RECORD_KEY]).pipe(
      map(([value]) => value),
      defaultIfEmpty(undefined),
    );

  const isPending = (record: PassportAccountRecord): boolean =>
    record.deployment !== undefined;

  const presenceOf = (
    value: PassportAccountRecord | SealedRecord | undefined,
  ): RecordPresence => {
    if (value === undefined) return 'absent';
    const isCreationPending = isSealedRecord(value)
      ? value.pending === true
      : isPending(value);
    return isCreationPending ? 'pending' : 'complete';
  };

  return {
    read: () =>
      keyProvider
        ? stored().pipe(concatMap(async value => open(keyProvider, value)))
        : stored().pipe(
            map(value => {
              if (!isSealedRecord(value)) return value;
              if (onSealedWithoutKey === 'error') {
                throw new RecordUnreadableError();
              }
              return undefined;
            }),
          ),
    write: record =>
      keyProvider
        ? defer(async () =>
            sealRecord(await keyProvider(), record, {
              pending: isPending(record),
            }),
          ).pipe(
            mergeMap(sealed => storage.setValue(ACCOUNT_RECORD_KEY, sealed)),
          )
        : storage.setValue(ACCOUNT_RECORD_KEY, record),
    presence: () => stored().pipe(map(presenceOf)),
  };
};

/**
 * The promise view of an {@link AccountRecordStore}, for the flows. A
 * storage that completes without emitting (destroyed mid-flow) reads as
 * absent and writes as done, mirroring the stream contract so a flow
 * never hangs on it.
 */
export const toAccountRecords = (
  store: AccountRecordStore,
): AccountRecords => ({
  read: async () => firstValueFrom(store.read(), { defaultValue: undefined }),
  write: async record =>
    firstValueFrom(store.write(record), { defaultValue: undefined }),
  presence: async () =>
    firstValueFrom(store.presence(), { defaultValue: 'absent' }),
});
