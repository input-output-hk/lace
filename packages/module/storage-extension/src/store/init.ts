import '@lace-contract/storage';
import { initializeDependencies } from './dependencies';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const initializeStore: LaceInit<LaceModuleStoreInit> = (
  props,
  dependencies,
) => ({
  sideEffectDependencies: initializeDependencies(props, dependencies),
});

export default initializeStore;
