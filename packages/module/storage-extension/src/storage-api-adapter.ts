import { Serializable } from '@lace-lib/util-store';
import { storage as extensionStorage } from 'webextension-polyfill';

import type { StorageAdapter } from '@lace-contract/storage';

export const storageApi: StorageAdapter<unknown> = {
  getItem: async key => {
    const values = await extensionStorage.local.get(key);
    return Serializable.from(values[key] as Serializable<unknown>) ?? null;
  },
  setItem: async (key, value) => {
    return extensionStorage.local.set({
      [key]: Serializable.to(value),
    });
  },
  removeItem: async key => extensionStorage.local.remove(key),
};
