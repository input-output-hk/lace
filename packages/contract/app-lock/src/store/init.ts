import { initializeAppLockSideEffects } from './side-effects';
import { appLockReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  sideEffects: await initializeAppLockSideEffects(props, dependencies),
  reducers: appLockReducers,
  persistConfig: {
    appLock: {
      version: 1,
      whitelist: ['encryptedSentinel'],
    },
  },
});

export default store;
