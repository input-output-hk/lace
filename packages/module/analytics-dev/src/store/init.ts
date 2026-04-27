import { sideEffectDependencies } from './dependencies';

import type { LaceInitSync, LaceModuleStoreInit } from '@lace-contract/module';

const initStore: LaceInitSync<LaceModuleStoreInit> = () => ({
  sideEffectDependencies,
});

export default initStore;
