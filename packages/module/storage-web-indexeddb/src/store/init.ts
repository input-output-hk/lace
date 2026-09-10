import { initializeDependencies } from './dependencies';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = (props, dependencies) => ({
  sideEffectDependencies: initializeDependencies(props, dependencies),
});

export default store;
