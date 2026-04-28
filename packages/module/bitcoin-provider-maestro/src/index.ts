import './augmentations';

import {
  BITCOIN_FEATURE_FLAG,
  bitcoinProviderContract,
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
  moduleName: ModuleName('bitcoin-provider-maestro'),
  dependsOn: combineContracts([] as const),
  implements: combineContracts([bitcoinProviderContract] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === BITCOIN_FEATURE_FLAG),
    metadata: {
      name: 'Maestro',
      description: 'Maestro provider for Bitcoin',
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
