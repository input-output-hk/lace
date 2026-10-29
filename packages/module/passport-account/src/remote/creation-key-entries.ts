import { defaultIfEmpty, firstValueFrom, map } from 'rxjs';

import type { KeyValueStorageFactory } from '@lace-contract/module';

const COLLECTION_ID = 'passport-creation-key-entries';
const ENTRIES_KEY = 'pending-creation';

/**
 * The creation in progress on this signer: the hostname of the dApp
 * origin that started it, and the creating device's envelope and
 * registration as lowercase hex.
 */
type PendingCreation = { origin: string; entries: string[] };

/**
 * The key entries the signer sealed for the account creation in progress
 * on this signer, with the hostname of the dApp origin that drew them.
 * `keep` replaces both when a creation draws its keys, `includes`
 * answers whether an append a later creation session asks for carries
 * one of the entries, so a resumed creation appends what this signer
 * sealed and nothing a dApp wrote into the record, `isFrom` whether a
 * hostname is the one that started the creation, so only that origin
 * resumes it, and `clear` forgets the creation once its record is
 * complete.
 */
export type CreationKeyEntries = {
  keep: (origin: string, entries: readonly string[]) => Promise<void>;
  includes: (entry: string) => Promise<boolean>;
  isFrom: (origin: string) => Promise<boolean>;
  clear: () => Promise<void>;
};

const isPendingCreation = (value: unknown): value is PendingCreation =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as PendingCreation).origin === 'string' &&
  Array.isArray((value as PendingCreation).entries);

/**
 * The signer's own record of the creation it is running, kept on the
 * signer origin where no dApp request writes. It holds one creation at a
 * time; drawing a new creation's keys replaces it. A value stored in any
 * other shape reads as no creation, so it neither admits an append nor
 * names an origin.
 */
export const createCreationKeyEntries = (
  createKeyValueStorage: KeyValueStorageFactory,
): CreationKeyEntries => {
  const storage = createKeyValueStorage<string, PendingCreation>({
    collectionId: COLLECTION_ID,
  });
  const read = async (): Promise<PendingCreation | undefined> =>
    firstValueFrom(
      storage.getValues([ENTRIES_KEY]).pipe(
        map(([stored]) => (isPendingCreation(stored) ? stored : undefined)),
        defaultIfEmpty(undefined),
      ),
    );
  const write = async (value: PendingCreation | undefined): Promise<void> =>
    firstValueFrom(
      storage.setValue(ENTRIES_KEY, value).pipe(defaultIfEmpty(void 0)),
    );
  return {
    keep: async (origin, entries) => write({ origin, entries: [...entries] }),
    includes: async entry => (await read())?.entries.includes(entry) ?? false,
    isFrom: async origin => (await read())?.origin === origin,
    clear: async () => write(undefined),
  };
};
