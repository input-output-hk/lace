import { analyticsStoreContract } from '@lace-contract/analytics';
import {
  authenticationPromptStoreContract,
  internalAuthSecretApiAddonContract,
} from '@lace-contract/authentication-prompt/src/contract';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  onboardingOptionsAddonContract,
  onboardingV2StoreContract,
} from '@lace-contract/onboarding-v2';
import {
  viewsStoreContract,
  stackPagesAddonContract,
} from '@lace-contract/views';
import {
  vaultContract,
  walletRepoStoreContract,
} from '@lace-contract/wallet-repo';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  onboardingV2StoreContract,
  stackPagesAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  vaultContract,
  viewsStoreContract,
  analyticsStoreContract,
  walletRepoStoreContract,
  inMemoryIntegrationAddonContract,
  authenticationPromptStoreContract,
  internalAuthSecretApiAddonContract,
  onboardingOptionsAddonContract,
] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('onboarding'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadStackPages: async () => import('./addons/loadStackPages'),
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
