import { DEFAULT_INACTIVITY_TIMEOUT_MS } from '../const';

import { initializeAppLockSideEffects } from './side-effects';
import { appLockReducers, initialState } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => {
  const [activityChannel] = await props.loadModules(
    'addons.loadActivityChannel',
  );
  return {
    sideEffects: await initializeAppLockSideEffects(props, dependencies),
    reducers: appLockReducers,
    preloadedState: {
      appLock: {
        ...initialState,
        defaultInactivityTimeoutMs:
          activityChannel?.defaultInactivityTimeoutMs ??
          DEFAULT_INACTIVITY_TIMEOUT_MS,
      },
    },
    persistConfig: {
      appLock: {
        version: 1,
        whitelist: ['encryptedSentinel', 'inactivityTimeout'],
      },
    },
  };
};

export default store;
