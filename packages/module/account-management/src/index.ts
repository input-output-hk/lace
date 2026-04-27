import './augmentations';

import { accountManagementStoreContract } from '@lace-contract/account-management';
import { addressesStoreContract } from '@lace-contract/addresses';
import { appStoreContract } from '@lace-contract/app';
import { featureStoreContract } from '@lace-contract/feature';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  hwBlockchainSupportAddonContract,
  onboardingOptionsAddonContract,
} from '@lace-contract/onboarding-v2';
import { recoveryPhraseStoreContract } from '@lace-contract/recovery-phrase';
import { secureStoreContract } from '@lace-contract/secure-store';
import { tokensStoreContract } from '@lace-contract/tokens';
import {
  viewsStoreContract,
  stackPagesAddonContract,
  tabPagesAddonContract,
  sheetPagesAddonContract,
} from '@lace-contract/views';
import {
  vaultContract,
  walletRepoStoreContract,
} from '@lace-contract/wallet-repo';

import { FEATURE_FLAG_ACCOUNT_MANAGEMENT } from './constants';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  stackPagesAddonContract,
  tabPagesAddonContract,
  accountManagementStoreContract,
  sheetPagesAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  appStoreContract,
  viewsStoreContract,
  featureStoreContract,
  vaultContract,
  walletRepoStoreContract,
  tokensStoreContract,
  addressesStoreContract,
  recoveryPhraseStoreContract,
  secureStoreContract,
  inMemoryIntegrationAddonContract,
  hwBlockchainSupportAddonContract,
  onboardingOptionsAddonContract,
] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('account-management'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_ACCOUNT_MANAGEMENT),
    metadata: {
      name: 'Account Management Module',
      description: 'A module to handle account management features',
    },
  },
  addons: {
    loadStackPages: async () => import('./addons/stackPages'),
    loadTabPages: async () => import('./addons/tabPages'),
    loadSheetPages: async () => import('./addons/sheetPages'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': extensionModule,
  'lace-extension': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
