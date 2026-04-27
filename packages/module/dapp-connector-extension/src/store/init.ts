import { initializeSideEffectDependencies } from './dependencies';

import type { LaceInitSync, LaceModuleStoreInit } from '@lace-contract/module';

const initStore: LaceInitSync<LaceModuleStoreInit> = (
  module,
  dependencies,
) => ({
  sideEffectDependencies: initializeSideEffectDependencies(
    module,
    dependencies,
  ),
});

export default initStore;
