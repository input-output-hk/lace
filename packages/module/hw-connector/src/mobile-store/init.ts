import { initializeSideEffects } from './side-effects';
import { hwConnectorMobileReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  sideEffects: await initializeSideEffects(props, dependencies),
  reducers: hwConnectorMobileReducers,
});

export default store;
