import { initializeSideEffectDependencies } from './dependencies';
import { initializeLaceExtensionSideEffects } from './side-effects-lace-extension';
import { midnightDappConnectorReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = (props, dependencies) => ({
  reducers: midnightDappConnectorReducers,
  sideEffects: initializeLaceExtensionSideEffects(props, dependencies),
  sideEffectDependencies: initializeSideEffectDependencies(dependencies),
});

export default store;
