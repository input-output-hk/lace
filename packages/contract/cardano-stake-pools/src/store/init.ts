import { cardanoStakePoolsSideEffects } from './side-effects';
import { cardanoStakePoolsReducers, initialState } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects: cardanoStakePoolsSideEffects,
  reducers: cardanoStakePoolsReducers,
  preloadedState: {
    cardanoStakePools: initialState,
  },
  persistConfig: {
    cardanoStakePools: {
      version: 1,
      whitelist: ['networkData', 'poolDetails', 'poolSummaries'],
    },
  },
});

export default store;
