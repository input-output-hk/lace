import {
  blockchainSpecificAppSettingsPageCustomizationsAddonContract,
  dialogsAddonContract,
} from '@lace-contract/app';
import { FeatureFlagKey, featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { swapContextStoreContract } from '@lace-contract/swap-context';
import {
  sheetPagesAddonContract,
  tabPagesAddonContract,
  viewsStoreContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

export * from './const';

const implementsContracts = combineContracts([
  tabPagesAddonContract,
  sheetPagesAddonContract,
  swapContextStoreContract,
  dialogsAddonContract,
  blockchainSpecificAppSettingsPageCustomizationsAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  viewsStoreContract,
  walletRepoStoreContract,
  featureStoreContract,
] as const);

const FEATURE_FLAG_SWAP_CENTER = FeatureFlagKey('SWAP_CENTER');

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('swap-center'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  addons: {
    loadTabPages: async () => import('./addons/tabPages'),
    loadSheetPages: async () => import('./addons/sheetPages'),
    loadDialogs: async () => import('./addons/dialogs'),
    loadSettingsPageUICustomisations: async () =>
      import('./addons/walletSettingsUI'),
  },
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_SWAP_CENTER),
    metadata: {
      name: 'SwapCenter',
      description: 'UI for Swaps',
    },
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
