import './augmentations';

import { appStoreContract } from '@lace-contract/app';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import {
  FEATURE_FLAG_GOVERNANCE_CENTER,
  governanceCenterStoreContract,
} from '@lace-contract/governance-center';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { tokenPricingStoreContract } from '@lace-contract/token-pricing';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';
import {
  initializeExtensionViewAddonContract,
  initializeMobileViewAddonContract,
  sheetPagesAddonContract,
  tabPagesAddonContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type * as _ from '@lace-contract/feature';
import type {
  LaceModuleMap,
  LaceSideEffect,
  ModuleActionCreators,
  ModuleAddons,
  ModuleSelectors,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  tabPagesAddonContract,
  sheetPagesAddonContract,
  initializeExtensionViewAddonContract,
  initializeMobileViewAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  appStoreContract,
  governanceCenterStoreContract,
  walletRepoStoreContract,
  cardanoProviderStoreContract,
  txExecutorStoreContract,
  tokenPricingStoreContract,
  networkStoreContract,
] as const);

const sharedModule = inferModuleContext({
  moduleName: ModuleName('governance-center'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_GOVERNANCE_CENTER),
    metadata: {
      name: 'GovernanceCenter',
      description: 'Governance center for Cardano voting power delegation',
    },
  },
  addons: {
    loadTabPages: async () => import('./addons/tabPages'),
    loadSheetPages: async () => import('./addons/sheetPages'),
    loadInitializeExtensionView: async () => import('./initialize-view'),
    loadInitializeMobileView: async () => import('./initialize-view'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': sharedModule,
  'lace-mobile': sharedModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof sharedModule>;
export type ActionCreators = ModuleActionCreators<typeof sharedModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
