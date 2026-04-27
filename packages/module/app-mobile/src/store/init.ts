import { initializeSideEffects } from './side-effects';
import { reducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const appMobileStore: LaceInit<LaceModuleStoreInit> = () => ({
  reducers,
  sideEffects: initializeSideEffects(),
  persistConfig: {
    mobile: { version: 1 },
  },
});

export default appMobileStore;
