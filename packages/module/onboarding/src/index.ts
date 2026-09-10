import { analyticsStoreContract } from '@lace-contract/analytics';
import {
  authenticationPromptStoreContract,
  internalAuthSecretApiAddonContract,
} from '@lace-contract/authentication-prompt/src/contract';
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
  vaultCapabilitiesAddonContract,
  vaultCeremonyStoreContract,
  vaultContract,
} from '@lace-contract/vault';
import {
  viewsStoreContract,
  stackPagesAddonContract,
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
  onboardingV2StoreContract,
  stackPagesAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  vaultContract,
  vaultCeremonyStoreContract,
  vaultCapabilitiesAddonContract,
  viewsStoreContract,
  analyticsStoreContract,
  walletRepoStoreContract,
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
  'lace-extension-guest': multiPlatformModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof multiPlatformModule>;
export type ActionCreators = ModuleActionCreators<typeof multiPlatformModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
