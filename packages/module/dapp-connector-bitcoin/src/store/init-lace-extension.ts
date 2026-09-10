import { initializeBitcoinDappConnectorSideEffectDependencies } from './dependencies/dapp-connector';
import { initializeLaceExtensionSideEffects } from './side-effects';
import { bitcoinDappConnectorReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = (props, dependencies) => ({
  reducers: bitcoinDappConnectorReducers,
  sideEffects: initializeLaceExtensionSideEffects(props, dependencies),
  sideEffectDependencies:
    initializeBitcoinDappConnectorSideEffectDependencies(dependencies),
  /**
   * Only the per-origin account choice survives the MV3 service worker being
   * torn down when idle; without it an authorized dapp would unbind from its
   * account on every reconnect. The rest of the slice is transient review UI
   * state and stays unpersisted.
   */
  persistConfig: {
    bitcoinDappConnector: {
      version: 1,
      whitelist: ['sessionAccountByOrigin'],
    },
  },
});

export default store;
