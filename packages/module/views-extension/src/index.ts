import './augmentations';

import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  initializeExtensionViewAddonContract,
  viewsStoreContract,
} from '@lace-contract/views';

import store from './store';

import type {
  ModuleActionCreators,
  LaceModuleMap,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  viewsStoreContract,
  initializeExtensionViewAddonContract,
] as const);
const dependsOnContracts = combineContracts([featureStoreContract] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('views-extension'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadInitializeExtensionView: async () =>
      import('./initialize-extension-view'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
