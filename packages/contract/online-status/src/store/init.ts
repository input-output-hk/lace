import { onlineStatusReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async () => ({
  reducers: onlineStatusReducers,
});

export default store;
