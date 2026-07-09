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
  // Persist only the per-origin account choice so an authorized dapp keeps
  // reconnecting to the same account across app restarts, without re-opening
  // the account picker. The binding is only cleared when the user revokes the
  // dapp from wallet settings. The rest of the slice is transient UI state and
  // stays unpersisted.
  persistConfig: {
    cardanoDappConnector: {
      version: 1,
      whitelist: ['sessionAccountByOrigin'],
    },
  },
});

export default store;
