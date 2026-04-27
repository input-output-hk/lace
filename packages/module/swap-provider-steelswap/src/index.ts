import './augmentations';

import { FeatureFlagKey } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { swapProviderDependencyContract } from '@lace-contract/swap-provider';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

const FEATURE_FLAG_SWAP_CENTER = FeatureFlagKey('SWAP_CENTER');

const sharedModule = inferModuleContext({
  moduleName: ModuleName('swap-provider-steelswap'),
  implements: combineContracts([swapProviderDependencyContract] as const),
  dependsOn: combineContracts([] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_SWAP_CENTER),
    metadata: {
      name: 'SteelSwap Provider',
      description: 'SteelSwap DEX aggregator for Cardano swaps',
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
