import './augmentations';

import { devContract } from '@lace-contract/dev';
import {
  featureStoreContract,
  featureDependencyContract,
  FEATURES_DEV_FEATURE_FLAG,
} from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
  isProductionEnvironment,
} from '@lace-contract/module';
import { initializeExtensionViewAddonContract } from '@lace-contract/views';

import store from './store';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  LaceModuleMap,
  ModuleAddons,
} from '@lace-contract/module';

export { FEATURES_DEV_FEATURE_FLAG } from '@lace-contract/feature';

const implementsContracts = combineContracts([
  featureStoreContract,
  featureDependencyContract,
  devContract,
  initializeExtensionViewAddonContract,
] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('feature-dev'),
  implements: implementsContracts,
  store,
  feature: {
    willLoad: (featureFlags, environment) =>
      !isProductionEnvironment(environment) &&
      featureFlags.some(flag => flag.key === FEATURES_DEV_FEATURE_FLAG),
    metadata: {
      name: 'FeatureDev',
      description: 'Development mode features module',
    },
  },
  addons: {
    loadInitializeExtensionView: async () =>
      import('./initialize-extension-view'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
  'lace-mobile': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<typeof implementsContracts>;
