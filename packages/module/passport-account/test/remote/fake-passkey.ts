import { createPasskeySessionKeySource } from '@lace-lib/passkey';
import { of } from 'rxjs';
import { vi } from 'vitest';

import type { KeyValueStorageFactory } from '@lace-contract/module';

const PRF_LENGTH = 32;

export const deviceOutput = () =>
  Uint8Array.from({ length: PRF_LENGTH }, (_, index) => index + 1);
export const rootOutput = () =>
  Uint8Array.from({ length: PRF_LENGTH }, (_, index) => 255 - index);

export const cancellation = () =>
  Object.assign(new Error('The operation was cancelled.'), {
    name: 'NotAllowedError',
  });

/**
 * A WebAuthn credentials container whose every assertion yields the same
 * PRF outputs, and a key source over it. `get` counts the ceremonies.
 */
export const createFakePasskey = () => {
  const rawId = new Uint8Array(16).fill(0xa5).buffer;
  const get = vi.fn(async (_options?: CredentialRequestOptions) => ({
    rawId,
    getClientExtensionResults: () => ({
      prf: { results: { first: deviceOutput(), second: rootOutput() } },
    }),
  }));
  const keySource = createPasskeySessionKeySource({
    rpId: 'localhost',
    credentials: { get } as unknown as CredentialsContainer,
  });
  return { get, keySource };
};

/** A key-value storage factory over one in-memory map per collection. */
export const createInMemoryStorage = () => {
  const collections = new Map<string, Map<string, unknown>>();
  const createKeyValueStorage: KeyValueStorageFactory = <K extends string, V>({
    collectionId,
  }: {
    collectionId: string;
  }) => {
    const values =
      collections.get(collectionId) ??
      collections.set(collectionId, new Map()).get(collectionId)!;
    return {
      getValues: (keys: readonly K[]) => {
        const found = keys.map(key => values.get(key));
        return found.includes(undefined) ? of() : of(found as V[]);
      },
      setValue: (key: K, value: V | undefined) => {
        if (value === undefined) values.delete(key);
        else values.set(key, value);
        return of(void 0);
      },
    };
  };
  const stored = (collectionId: string, key: string): unknown =>
    collections.get(collectionId)?.get(key);
  return { createKeyValueStorage, stored };
};
