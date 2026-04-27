import {
  BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG,
  bitcoinFeeMarketProvider,
} from '@lace-contract/bitcoin-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

const sharedModule = inferModuleContext({
  moduleName: ModuleName('bitcoin-mempool-fee-market'),
  dependsOn: combineContracts([] as const),
  implements: combineContracts([bitcoinFeeMarketProvider] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(
        flag => flag.key === BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG,
      ),
    metadata: {
      name: 'Mempool.space fee market provider',
      description: 'Mempool.space fee market provider for Bitcoin',
    },
  },
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension': sharedModule,
  'lace-mobile': sharedModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof sharedModule>;
export type ActionCreators = ModuleActionCreators<typeof sharedModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
