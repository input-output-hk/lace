import { initializeSideEffects } from './side-effects';
import { migrateMultiDelegationReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = (props, dependencies) => {
  return {
    reducers: migrateMultiDelegationReducers,
    sideEffects: initializeSideEffects(props, dependencies),
  };
};

export default redux;
