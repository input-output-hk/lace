import './augmentations';

import {
  accountManagementStoreContract,
  walletSettingsUICustomisationAddonContract,
} from '@lace-contract/account-management';
import { addressesStoreContract } from '@lace-contract/addresses';
import { analyticsStoreContract } from '@lace-contract/analytics';
import { blockchainSpecificAppSettingsPageCustomizationsAddonContract } from '@lace-contract/app';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import {
  cardanoProviderStoreContract,
  earnRewardsTxBuilderAddonContract,
} from '@lace-contract/cardano-context';
import { cardanoStakePoolsStoreContract } from '@lace-contract/cardano-stake-pools';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  hwBlockchainSupportAddonContract,
  onboardingEntryAddonContract,
  onboardingOptionsAddonContract,
  onboardingV2StoreContract,
} from '@lace-contract/onboarding-v2';
import { signerStoreContract } from '@lace-contract/signer';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';
import {
  globalOverlaysAddonContract,
  viewsStoreContract,
} from '@lace-contract/views';
import {
  requestHWConnectionAddonContract,
  walletRepoStoreContract,
} from '@lace-contract/wallet-repo';

import { MIGRATE_WALLET_FEATURE_FLAG } from './const';
import store from './store';

import type {
  ActionType,
  LaceModuleMap,
  LaceSideEffect,
  ModuleActionCreators,
  ModuleAddons,
  ModuleSelectors,
} from '@lace-contract/module';
export * from './const';

const implementsContracts = combineContracts([
  blockchainSpecificAppSettingsPageCustomizationsAddonContract,
  globalOverlaysAddonContract,
  onboardingEntryAddonContract,
  walletSettingsUICustomisationAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  analyticsStoreContract,
  authenticationPromptStoreContract,
  addressesStoreContract,
  cardanoProviderStoreContract,
  // The post-sweep delegation reuses the earn-rewards certificate builder and
  // the shared executor rather than rebuilding either. Deliberately the ADDON,
  // not `earnRewardsStoreContract`: that one is implemented only while the
  // earn-rewards feature is on, and depending on it would stop the migration
  // loading at all whenever the feature is off.
  earnRewardsTxBuilderAddonContract,
  // For the pool-choice step: the picker publishes the user's pick through
  // this contract's selection slice (LW-15293). Implemented by
  // blockchain-cardano-ui, which loads whenever Cardano does.
  cardanoStakePoolsStoreContract,
  txExecutorStoreContract,
  signerStoreContract,
  onboardingV2StoreContract,
  onboardingOptionsAddonContract,
  hwBlockchainSupportAddonContract,
  accountManagementStoreContract,
  walletRepoStoreContract,
  requestHWConnectionAddonContract,
  // For the cancel exit: a run opened with no wallets closes over the
  // latched onboarding route, so a user cancel must land on Home instead.
  viewsStoreContract,
] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('migrate-wallet'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadGlobalOverlays: async () => import('./addons/load-global-overlays'),
    loadOnboardingEntryUICustomisations: async () =>
      import('./addons/onboarding-entry'),
    loadSettingsPageUICustomisations: async () =>
      import('./addons/settings-page-ui-customisation'),
    loadWalletSettingsUICustomisations: async () =>
      import('./addons/wallet-settings-entry'),
  },
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === MIGRATE_WALLET_FEATURE_FLAG),
    metadata: {
      name: 'migrate-wallet',
      description:
        'Migrate an external wallet into Lace: import its seed, sweep all assets to a fresh wallet',
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
export type MigrateWalletAction = ActionType<ActionCreators>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
