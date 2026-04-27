import { initializeSideEffects } from './side-effects';
import { sendFlowReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  reducers: sendFlowReducers,
  sideEffects: await initializeSideEffects(props, dependencies),
});

export default store;

export { sendFlowActions, sendFlowSelectors } from './slice';
