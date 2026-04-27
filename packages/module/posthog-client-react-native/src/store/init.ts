import { initializeSideEffectDependencies } from './dependencies';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = (props, dependencies) => ({
  sideEffectDependencies: initializeSideEffectDependencies(props, dependencies),
});

export default store;
