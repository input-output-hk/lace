import { addressesReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const addressesStoreInit: LaceInit<LaceModuleStoreInit> = () => ({
  reducers: addressesReducers,
  persistConfig: {
    addresses: {
      whitelist: ['addresses'],
      version: 1,
    },
  },
});

export default addressesStoreInit;
