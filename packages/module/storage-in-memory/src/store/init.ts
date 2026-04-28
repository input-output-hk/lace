import { sideEffectDependencies } from './dependencies';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffectDependencies: sideEffectDependencies,
});

export default store;
