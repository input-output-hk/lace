import { localAuthenticationDependencyContract } from '@lace-contract/authentication-prompt';
import {
  combineContracts,
  inferModuleContext,
  type ModuleAddons,
  ModuleName,
} from '@lace-contract/module';
import {
  secureStoreContract,
  secureStoreAddonContract,
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

const mobileModule = inferModuleContext({
  moduleName: ModuleName('secure-store-mobile'),
  implements: implementsContracts,
  store,
  addons: {
    loadSecureStore: async () => import('./addons/secure-store'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': mobileModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof mobileModule>;
export type ActionCreators = ModuleActionCreators<typeof mobileModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<typeof implementsContracts>;
