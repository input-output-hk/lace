import { MMKV } from 'react-native-mmkv';

import type { StorageAdapter } from '@lace-contract/storage';

const storage = new MMKV();

export const storageApi: StorageAdapter<unknown> = {
  getItem: async key => {
    try {
      const value = storage.getString(key);
      return value ? (JSON.parse(value) as unknown) : null;
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    storage.set(key, JSON.stringify(value));
  },
  removeItem: async key => {
    storage.delete(key);
  },
};
