import { notificationCenterReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  reducers: notificationCenterReducers,
  persistConfig: {
    notificationCenter: {
      version: 1,
      whitelist: ['notifications', 'topics'],
    },
  },
});

export default store;
