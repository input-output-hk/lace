import { createPersistentAuthenticatorStorage } from '../../src';

import type { Storage } from 'webextension-polyfill';

describe('createPersistentAuthenticatorStorage', () => {
  it('wraps calls to underlying storage under specified key', async () => {
    const storageKey = 'key';
    const underlyingStorage = {
      clear: vi.fn(),
      get: vi.fn(),
      remove: vi.fn(),
      set: vi.fn(),
    };
    const storage = createPersistentAuthenticatorStorage(
      storageKey,
      underlyingStorage as unknown as Storage.StorageArea,
    );
    const origins = ['origin'];
    await storage.set(origins);
    expect(underlyingStorage.set).toBeCalledWith({ [storageKey]: origins });
    await storage.get();
    expect(underlyingStorage.get).toBeCalledTimes(1);
  });
});
