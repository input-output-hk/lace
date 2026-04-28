import './augmentations';

import {
  cardanoProviderStoreContract,
  cardanoProviderDependencyContract,
  FEATURE_FLAG_CARDANO,
} from '@lace-contract/cardano-context';
import { cryptoAddonContract } from '@lace-contract/crypto';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import '@lace-contract/feature';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

const sharedModule = inferModuleContext({
  moduleName: ModuleName('cardano-provider-blockfrost'),
  dependsOn: combineContracts([cryptoAddonContract] as const),
  implements: combineContracts([
    cardanoProviderStoreContract,
    cardanoProviderDependencyContract,
  ] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_CARDANO),
    metadata: {
      name: 'Blockfrost',
      description: 'Blockfrost provider for Cardano',
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
