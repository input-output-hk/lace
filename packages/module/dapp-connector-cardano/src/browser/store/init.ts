import { cardanoDappConnectorReducers } from '../../common/store/slice';

import { initializeSideEffectDependencies } from './dependencies';
import { initializeSideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = (props, dependencies) => ({
  reducers: cardanoDappConnectorReducers,
  sideEffects: initializeSideEffects(props, dependencies),
  sideEffectDependencies: initializeSideEffectDependencies(dependencies),
});

export default store;
