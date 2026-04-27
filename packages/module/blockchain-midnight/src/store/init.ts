import { initializeMidnightSideEffectDependencies } from './dependencies';
import { initializeSideEffects } from './side-effects';
import { midnightReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = (props, dependencies) => ({
  reducers: midnightReducers,
  sideEffects: initializeSideEffects(props, dependencies),
  sideEffectDependencies: initializeMidnightSideEffectDependencies(
    props,
    dependencies,
  ),
});

export default store;
