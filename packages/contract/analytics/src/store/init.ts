import { analyticsSideEffects } from './side-effects';
import { analyticsReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const analyticsStore: LaceInit<LaceModuleStoreInit> = () => ({
  reducers: analyticsReducers,
  sideEffects: analyticsSideEffects,
  persistConfig: {
    analytics: { version: 1 },
  },
});

export default analyticsStore;
