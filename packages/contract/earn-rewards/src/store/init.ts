import { initializeSideEffects } from './side-effects';
import { earnRewardsReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => {
  const sideEffects = await initializeSideEffects(props, dependencies);

  return {
    reducers: earnRewardsReducers,
    sideEffects,
  };
};

export default store;
