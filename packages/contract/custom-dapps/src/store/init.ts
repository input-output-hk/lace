import { customDappsReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  reducers: customDappsReducers,
  persistConfig: {
    customDapps: {
      version: 1,
    },
  },
});

export default store;
