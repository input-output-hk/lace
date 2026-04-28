import { appStoreContract } from '@lace-contract/app';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import { cardanoStakePoolsStoreContract } from '@lace-contract/cardano-stake-pools';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import {
  FEATURE_FLAG_STAKING_CENTER,
  stakingCenterStoreContract,
} from '@lace-contract/staking-center';
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
  stakingCenterStoreContract,
  walletRepoStoreContract,
  cardanoProviderStoreContract,
  txExecutorStoreContract,
  tokenPricingStoreContract,
  networkStoreContract,
  cardanoStakePoolsStoreContract,
] as const);

const sharedModule = inferModuleContext({
  moduleName: ModuleName('staking-center'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_STAKING_CENTER),
    metadata: {
      name: 'StakingCenter',
      description: 'Staking management for Cardano',
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
