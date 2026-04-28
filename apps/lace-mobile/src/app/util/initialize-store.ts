import {
  createReduxPersistStorage,
  createStore,
  findStorageModule,
} from '@lace-contract/module';
import devToolsEnhancer from 'redux-devtools-expo-dev-plugin';

import { ENV } from './config';
import { createMobileModuleLoader } from './load-modules';
import { logger } from './logger';

import type { LaceStore } from './types';
import type { CreateStoreProps, ViewId } from '@lace-contract/module';

export const initializeStore = async (
  viewId: ViewId,
): Promise<[LaceStore, CreateStoreProps]> => {
  const createStoreProps = await createMobileModuleLoader(
    viewId,
    ENV === 'development' ? devToolsEnhancer() : undefined,
  );
  const initializers = await createStoreProps.loadModules(
    'addons.loadInitializeAppContext',
  );

  const storageModule = await findStorageModule(createStoreProps, { logger });
  const reduxPersistStorage = createReduxPersistStorage(storageModule);

  logger.debug('Loaded features', createStoreProps.runtime.features.loaded);

  for (const init of initializers) {
    init();
  }

  const { store } = await createStore(createStoreProps, {
    logger,
    reduxPersistStorage,
  });
  return [store, createStoreProps];
};
