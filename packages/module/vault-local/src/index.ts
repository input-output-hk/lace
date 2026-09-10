import { accountManagementStoreContract } from '@lace-contract/account-management';
import { analyticsStoreContract } from '@lace-contract/analytics';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt/src/contract';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  hwBlockchainSupportAddonContract,
  onboardingOptionsAddonContract,
  onboardingV2StoreContract,
} from '@lace-contract/onboarding-v2';
import {
  vaultCapabilitiesAddonContract,
  vaultCeremonyStoreContract,
  vaultContract,
} from '@lace-contract/vault';
import {
  sheetPagesAddonContract,
  stackPagesAddonContract,
  viewsStoreContract,
} from '@lace-contract/views';
import {
  requestHWConnectionAddonContract,
  walletRepoStoreContract,
} from '@lace-contract/wallet-repo';

import store from './store';

import type {
  LaceModuleMap,
  LaceSideEffect,
  ModuleActionCreators,
  ModuleAddons,
  ModuleSelectors,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  vaultCeremonyStoreContract,
  vaultCapabilitiesAddonContract,
  stackPagesAddonContract,
  sheetPagesAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  vaultContract,
  viewsStoreContract,
  analyticsStoreContract,
  walletRepoStoreContract,
  accountManagementStoreContract,
  onboardingV2StoreContract,
  inMemoryIntegrationAddonContract,
  authenticationPromptStoreContract,
  onboardingOptionsAddonContract,
  hwBlockchainSupportAddonContract,
  requestHWConnectionAddonContract,
] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('vault-local'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadStackPages: async () => import('./addons/loadStackPages'),
    loadSheetPages: async () => import('./addons/loadSheetPages'),
    loadVaultCapabilities: async () => import('./addons/vaultCapabilities'),
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
