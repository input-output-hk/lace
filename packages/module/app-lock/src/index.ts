import './augmentations';

import { blockchainSpecificAppSettingsPageCustomizationsAddonContract } from '@lace-contract/app';
import {
  appLockStoreContract,
  appLockSetupAddon,
} from '@lace-contract/app-lock';
import { authSecretVerifierAddonContract } from '@lace-contract/authentication-prompt';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  sheetPagesAddonContract,
  viewsStoreContract,
} from '@lace-contract/views';
import { walletActiveStateDependencyContract } from '@lace-contract/wallet-active-state';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  appLockSetupAddon,
  appLockStoreContract,
  authSecretVerifierAddonContract,
  sheetPagesAddonContract,
  blockchainSpecificAppSettingsPageCustomizationsAddonContract,
  walletActiveStateDependencyContract,
] as const);
const dependsOnContracts = combineContracts([viewsStoreContract] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('app-lock'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadAuthSecretVerifier: async () => import('./addons/auth-secret-verifier'),
    loadSetupAppLock: async () => import('./addons/setup-app-lock'),
    loadSettingsPageUICustomisations: async () =>
      import('./addons/settings-page-ui-customisation'),
    loadSheetPages: async () => import('./addons/sheetPages'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': multiPlatformModule,
  'lace-mobile': multiPlatformModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof multiPlatformModule>;
export type ActionCreators = ModuleActionCreators<typeof multiPlatformModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
