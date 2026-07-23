import {
  cardanoProviderStoreContract,
  FEATURE_FLAG_CARDANO,
} from '@lace-contract/cardano-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { syncStoreContract } from '@lace-contract/sync';

import store from './store';

import type {
  ActionType,
  LaceModuleMap,
  LaceSideEffect,
  ModuleActionCreators,
  ModuleSelectors,
} from '@lace-contract/module';

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('cardano-sync'),
  implements: combineContracts([] as const),
  dependsOn: combineContracts([
    cardanoProviderStoreContract,
    syncStoreContract,
  ] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_CARDANO),
    metadata: {
      name: 'CardanoSync',
      description: 'Cardano provider-backed sync executors and round model',
    },
  },
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension': multiPlatformModule,
  'lace-mobile': multiPlatformModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof multiPlatformModule>;
export type ActionCreators = ModuleActionCreators<typeof multiPlatformModule>;
export type CardanoSyncAction = ActionType<ActionCreators>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
