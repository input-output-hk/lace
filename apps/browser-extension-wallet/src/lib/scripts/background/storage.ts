import { storage as webStorage } from 'webextension-polyfill';
import type { BackgroundStorage, BackgroundStorageKeys, MigrationState } from '../types';

export const INITIAL_STORAGE = { MIGRATION_STATE: { state: 'not-loaded' } as MigrationState };

/**
 * Deletes the specified `keys` from the background storage.
 *
 * If no `options` are passed then **ALL** of it is cleared.
 *
 * @param options Optional. List of keys to either delete or remove from storage
 */
type ClearBackgroundStorageOptions =
  | {
      keys: BackgroundStorageKeys[];
      except?: never;
    }
  | {
      keys?: never;
      except: BackgroundStorageKeys[];
    };

/**
 * Gets the background storage content
 */
export const getBackgroundStorage = async (): Promise<BackgroundStorage> =>
  (await webStorage.local.get('BACKGROUND_STORAGE'))?.BACKGROUND_STORAGE ?? {};

export const clearBackgroundStorage = async (options?: ClearBackgroundStorageOptions): Promise<void> => {
  if (!options) {
    await webStorage.local.remove('BACKGROUND_STORAGE');
    return;
  }
  const backgroundStorage = await getBackgroundStorage();
  for (const key in backgroundStorage) {
    if (options.keys && options.keys.includes(key as BackgroundStorageKeys)) {
      delete backgroundStorage[key as BackgroundStorageKeys];
    }
    if (options.except && !options.except.includes(key as BackgroundStorageKeys)) {
      delete backgroundStorage[key as BackgroundStorageKeys];
    }
  }
  await webStorage.local.set({ BACKGROUND_STORAGE: backgroundStorage ?? {} });
};

/**
 * Adds content to the background storage. Does not replace it.
 */
export const setBackgroundStorage = async (data: BackgroundStorage): Promise<void> => {
  const backgroundStorage = await getBackgroundStorage();

  await webStorage.local.set({ BACKGROUND_STORAGE: { ...backgroundStorage, ...data } });
};

/**
 * Initialize MIGRATION_STATE
 */
export const initMigrationState = async (): Promise<void> => {
  await webStorage.local.set(INITIAL_STORAGE);
};
