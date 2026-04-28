import { bitcoinAccountWallets$ } from '../wallet';

import { createBitcoinProviderSideEffects } from './side-effects';
import { bitcoinContextReducers, bitcoinContextSelectors } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = props => ({
  sideEffects: createBitcoinProviderSideEffects(props.runtime.config),
  reducers: bitcoinContextReducers,
  selectors: bitcoinContextSelectors,
  sideEffectDependencies: {
    bitcoinAccountWallets$,
  },
});

export default store;
