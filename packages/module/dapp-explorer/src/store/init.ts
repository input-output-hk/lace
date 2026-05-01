import { dappCenterReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const dappExplorerStore: LaceInit<LaceModuleStoreInit> = () => ({
  reducers: dappCenterReducers,
  persistConfig: {
    dappExplorer: {
      version: 1,
      whitelist: ['selectedDapp', 'categories', 'dappList'],
    },
  },
});

export default dappExplorerStore;
