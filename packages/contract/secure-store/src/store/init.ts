import { initializeSecureStoreSideEffectDependencies } from './dependencies';
import { secureStoreSideEffects } from './side-effects';
import { secureStoreReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  sideEffectDependencies: await initializeSecureStoreSideEffectDependencies(
    props,
    dependencies,
  ),
  sideEffects: secureStoreSideEffects,
  reducers: secureStoreReducers,
});

export default store;
