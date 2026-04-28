import {
  appContextInitializationAddonContract,
  appStoreContract,
} from '@lace-contract/app';
import { i18nDependencyContract } from '@lace-contract/i18n';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  initializeExtensionViewAddonContract,
  initializeMobileViewAddonContract,
  viewsStoreContract,
} from '@lace-contract/views';

import store from './store';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceModuleMap,
  ModuleAddons,
} from '@lace-contract/module';

const dependsOnContracts = combineContracts([
  viewsStoreContract,
  appStoreContract,
] as const);
const implementsContracts = combineContracts([
  i18nDependencyContract,
  appContextInitializationAddonContract,
  initializeExtensionViewAddonContract,
] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('i18n'),
  dependsOn: dependsOnContracts,
  implements: implementsContracts,
  store,
  addons: {
    loadInitializeAppContext: async () => import('./initialize-app-context'),
    loadInitializeExtensionView: async () =>
      import('./initialize-extension-view'),
  },
});

const mobileModule = inferModuleContext({
  moduleName: ModuleName('i18n'),
  dependsOn: combineContracts([viewsStoreContract, appStoreContract] as const),
  implements: combineContracts([
    i18nDependencyContract,
    appContextInitializationAddonContract,
    initializeMobileViewAddonContract,
  ] as const),
  store,
  addons: {
    loadInitializeAppContext: async () => import('./initialize-app-context'),
    loadInitializeMobileView: async () => import('./initialize-mobile-view'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
  'lace-mobile': mobileModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
