import { initializeSideEffects } from './side-effects';
import { governanceCenterReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => {
  const sideEffects = await initializeSideEffects(props, dependencies);

  return {
    reducers: governanceCenterReducers,
    persistConfig: {
      governanceCenterConfig: {
        version: 1,
        whitelist: ['disclaimerAcknowledged'],
      },
      // Persisted so delegated-DRep details render instantly across app
      // starts; every governance-center visit still refetches the list
      // (stale-while-revalidate in fetchDRepsSideEffect).
      dRepsList: {
        version: 1,
        whitelist: ['dReps', 'fetchedAt'],
      },
    },
    sideEffects,
  };
};

export default store;
