import { initializeSideEffectDependencies } from './dependencies';

import type { LaceInitSync, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInitSync<LaceModuleStoreInit> = (props, dependencies) => ({
  sideEffectDependencies: initializeSideEffectDependencies(props, dependencies),
});

export default store;
