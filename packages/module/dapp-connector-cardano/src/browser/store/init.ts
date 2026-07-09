import { cardanoDappConnectorReducers } from '../../common/store/slice';

import { initializeSideEffectDependencies } from './dependencies';
import { initializeSideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = (props, dependencies) => ({
  reducers: cardanoDappConnectorReducers,
  sideEffects: initializeSideEffects(props, dependencies),
  sideEffectDependencies: initializeSideEffectDependencies(dependencies),
  // Persist only the per-origin account choice: the MV3 SW is torn down when
  // idle, wiping in-memory state, which would otherwise make an authorized
  // multi-account dapp re-open the account picker on every reconnect. The rest
  // of the slice is transient UI state and stays unpersisted.
  persistConfig: {
    cardanoDappConnector: {
      version: 1,
      whitelist: ['sessionAccountByOrigin'],
    },
  },
});

export default store;
