// The Cardano sync module and the types its store is written against.
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
  LaceSideEffect,
  ModuleActionCreators,
  ModuleSelectors,
} from '@lace-contract/module';

export const cardanoSyncModule = inferModuleContext({
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

export type Selectors = ModuleSelectors<typeof cardanoSyncModule>;
export type ActionCreators = ModuleActionCreators<typeof cardanoSyncModule>;
export type CardanoSyncAction = ActionType<ActionCreators>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
