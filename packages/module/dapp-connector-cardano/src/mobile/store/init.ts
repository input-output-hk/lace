import { cardanoDappConnectorReducers } from '../../common/store/slice';

import { initializeMobilePlatformDependencies } from './platform-dependencies';
import { mobileSideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = (props, dependencies) => ({
  reducers: cardanoDappConnectorReducers,
  sideEffects: mobileSideEffects,
  sideEffectDependencies: initializeMobilePlatformDependencies(
    props,
    dependencies,
  ),
});

export default store;
