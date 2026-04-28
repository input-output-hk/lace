import { initializeSignerSideEffectDependencies } from './dependencies';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  sideEffectDependencies: await initializeSignerSideEffectDependencies(
    props,
    dependencies,
  ),
});

export default store;
