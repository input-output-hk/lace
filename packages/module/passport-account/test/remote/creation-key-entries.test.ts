import { describe, expect, it } from 'vitest';

import { createCreationKeyEntries } from '../../src/remote/creation-key-entries';

import { createInMemoryStorage } from './fake-passkey';

const ENVELOPE = 'd1'.repeat(192);
const REGISTRATION = 'd2'.repeat(192);
const LATER = 'd3'.repeat(192);
const ORIGIN = 'dapp.example';
const OTHER_ORIGIN = 'other.example';
const COLLECTION_ID = 'passport-creation-key-entries';
const ENTRIES_KEY = 'pending-creation';

const setup = () => {
  const { createKeyValueStorage, stored } = createInMemoryStorage();
  return {
    entries: createCreationKeyEntries(createKeyValueStorage),
    stored,
    createKeyValueStorage,
  };
};

describe('createCreationKeyEntries', () => {
  it('includes nothing and names no origin before a creation keeps its entries', async () => {
    const { entries } = setup();

    await expect(entries.includes(ENVELOPE)).resolves.toBe(false);
    await expect(entries.isFrom(ORIGIN)).resolves.toBe(false);
  });

  it('includes exactly the entries kept, with the origin that drew them, in their own collection', async () => {
    const { entries, stored } = setup();

    await entries.keep(ORIGIN, [ENVELOPE, REGISTRATION]);

    await expect(entries.includes(ENVELOPE)).resolves.toBe(true);
    await expect(entries.includes(REGISTRATION)).resolves.toBe(true);
    await expect(entries.includes(LATER)).resolves.toBe(false);
    await expect(entries.isFrom(ORIGIN)).resolves.toBe(true);
    await expect(entries.isFrom(OTHER_ORIGIN)).resolves.toBe(false);
    expect(stored(COLLECTION_ID, ENTRIES_KEY)).toEqual({
      origin: ORIGIN,
      entries: [ENVELOPE, REGISTRATION],
    });
  });

  it('replaces the entries and origin a previous creation kept', async () => {
    const { entries } = setup();
    await entries.keep(ORIGIN, [ENVELOPE, REGISTRATION]);

    await entries.keep(OTHER_ORIGIN, [LATER]);

    await expect(entries.includes(ENVELOPE)).resolves.toBe(false);
    await expect(entries.includes(LATER)).resolves.toBe(true);
    await expect(entries.isFrom(ORIGIN)).resolves.toBe(false);
    await expect(entries.isFrom(OTHER_ORIGIN)).resolves.toBe(true);
  });

  it('forgets the creation once cleared', async () => {
    const { entries, stored } = setup();
    await entries.keep(ORIGIN, [ENVELOPE]);

    await entries.clear();

    await expect(entries.includes(ENVELOPE)).resolves.toBe(false);
    await expect(entries.isFrom(ORIGIN)).resolves.toBe(false);
    expect(stored(COLLECTION_ID, ENTRIES_KEY)).toBeUndefined();
  });

  it('reads a value stored in another shape as no creation', async () => {
    const { entries, createKeyValueStorage } = setup();
    await new Promise<void>(resolve => {
      createKeyValueStorage<string, string[]>({ collectionId: COLLECTION_ID })
        .setValue(ENTRIES_KEY, [ENVELOPE])
        .subscribe({ complete: resolve });
    });

    await expect(entries.includes(ENVELOPE)).resolves.toBe(false);
    await expect(entries.isFrom(ORIGIN)).resolves.toBe(false);
  });
});
