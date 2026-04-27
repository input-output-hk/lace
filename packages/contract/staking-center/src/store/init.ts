import { initializeDeregistrationSideEffects } from './deregistration-side-effects';
import { initializeSideEffects } from './side-effects';
import { stakingCenterReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => {
  const delegationSideEffects = await initializeSideEffects(
    props,
    dependencies,
  );
  const deregistrationSideEffects = await initializeDeregistrationSideEffects(
    props,
    dependencies,
  );

  return {
    reducers: stakingCenterReducers,
    sideEffects: [...delegationSideEffects, ...deregistrationSideEffects],
  };
};

export default store;
