import { initializeSideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  sideEffects: await initializeSideEffects(props, dependencies),
});

export default store;

export { txExecutorActions } from './slice';
