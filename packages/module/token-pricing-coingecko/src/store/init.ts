import { initializeDependencies } from './dependencies';

import type { LaceInitSync, LaceModuleStoreInit } from '@lace-contract/module';

const initializeModuleStore: LaceInitSync<LaceModuleStoreInit> = (
  props,
  dependencies,
) => ({
  sideEffects: [],
  sideEffectDependencies: initializeDependencies(props, dependencies),
});

export default initializeModuleStore;
