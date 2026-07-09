import { trackFailures } from './side-effects';
import { failuresReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  reducers: failuresReducers,
  sideEffects: [trackFailures],
});

export default store;
