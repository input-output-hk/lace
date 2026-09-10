import { createMigrate } from 'redux-persist';

import { dropIncompleteNetworkData } from './migrations/drop-incomplete-network-data';
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
      version: 2,
      whitelist: ['networkData', 'poolDetails', 'poolSummaries'],
      migrate: createMigrate({
        2: dropIncompleteNetworkData,
      }),
    },
  },
});

export default store;
