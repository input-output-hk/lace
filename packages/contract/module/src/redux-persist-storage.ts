import { contextLogger } from '@cardano-sdk/util';
import { defaultIfEmpty, firstValueFrom, map } from 'rxjs';

import type { KeyValueStorageFactory } from './storage';
import type { CreateLoaderProps, ModuleInitDependencies } from './types';
import type { Storage } from 'redux-persist';

export const STORAGE_CONTRACT_NAME = 'storage-dependency';

export const createReduxPersistStorage = (
  keyValueStorageFactory: KeyValueStorageFactory,
): Storage => {
  const keyValueStorage = keyValueStorageFactory({ collectionId: 'redux' });
  return {
    getItem: async key =>
      firstValueFrom(
        keyValueStorage.getValues([key]).pipe(
          map(([value]) => value),
          defaultIfEmpty(void 0),
        ),
      ),
    removeItem: async key =>
      firstValueFrom(keyValueStorage.setValue(key, undefined)),
    setItem: async (key, value) =>
      firstValueFrom(keyValueStorage.setValue(key, value)),
  };
};

export const findStorageModule = async (
  props: Readonly<CreateLoaderProps>,
  {
    logger,
    ...rest
  }: Readonly<Omit<ModuleInitDependencies, 'reduxPersistStorage'>>,
) => {
  const storageModule = props.modules.find(m =>
    m.implements.contracts.some(
      contract => contract.name === STORAGE_CONTRACT_NAME,
    ),
  );
  if (!storageModule) {
    throw new Error('No storage module found');
  }
  const storageModuleStore = await storageModule.store?.load();
  if (!storageModuleStore) {
    throw new Error(
      `Module '${storageModule.moduleName}' must implement 'createKeyValueStorage' in store sideEffectDependencies`,
    );
  }
  const dependencies = {
    ...rest,
    logger: contextLogger(
      contextLogger(logger, storageModule.moduleName),
      'redux-storage',
    ),
    // this module provides storage, it doesn't use it
    reduxPersistStorage: {} as Storage,
  };
  const store = await storageModuleStore.default(
    {
      ...props,
      loadModules: () => {
        throw new Error('Storage module "store" cannot load other modules');
      },
    },
    dependencies,
  );
  const keyValueStorageFactory =
    store.sideEffectDependencies?.createKeyValueStorage;
  if (!keyValueStorageFactory) {
    throw new Error(
      `Module '${storageModule.moduleName}' must implement 'createKeyValueStorage' in store sideEffectDependencies`,
    );
  }
  return keyValueStorageFactory;
};
