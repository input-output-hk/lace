import { localAuthenticationDependencyContract } from '@lace-contract/authentication-prompt';
import {
  combineContracts,
  inferModuleContext,
  type ModuleAddons,
  ModuleName,
} from '@lace-contract/module';
import {
  secureStoreAddonContract,
  secureStoreContract,
  secureStoreDependencyContract,
} from '@lace-contract/secure-store';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  secureStoreContract,
  secureStoreAddonContract,
  secureStoreDependencyContract,
  localAuthenticationDependencyContract,
] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('secure-store-extension'),
  implements: implementsContracts,
  store,
  addons: {
    loadSecureStore: async () => import('./addons/secure-store'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<typeof implementsContracts>;
