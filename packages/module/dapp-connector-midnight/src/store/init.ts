import { initializeSideEffectDependencies } from './dependencies';
import { initializeSideEffects } from './side-effects';
import { midnightDappConnectorReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = (props, dependencies) => ({
  reducers: midnightDappConnectorReducers,
  sideEffects: initializeSideEffects(props, dependencies),
  sideEffectDependencies: initializeSideEffectDependencies(dependencies),
});

export default store;
