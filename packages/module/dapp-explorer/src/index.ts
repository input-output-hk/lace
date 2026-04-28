import './augmentations';

import { dialogsAddonContract } from '@lace-contract/app';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import { FeatureFlagKey, featureStoreContract } from '@lace-contract/feature';
import { i18nDependencyContract } from '@lace-contract/i18n';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import {
  viewsStoreContract,
  tabPagesAddonContract,
  sheetPagesAddonContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  tabPagesAddonContract,
  sheetPagesAddonContract,
  dialogsAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  authenticationPromptStoreContract,
  viewsStoreContract,
  featureStoreContract,
  networkStoreContract,
  walletRepoStoreContract,
  i18nDependencyContract,
] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('dapp-explorer'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FeatureFlagKey('DAPP_EXPLORER')),
    metadata: {
      name: 'Dapp Explorer Module',
      description: 'A module to handle dapp explorer center',
    },
  },
  addons: {
    loadTabPages: async () => import('./addons/tabPages'),
    loadSheetPages: async () => import('./addons/bottomSheets'),
    loadDialogs: async () => import('./addons/dialogs'),
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
