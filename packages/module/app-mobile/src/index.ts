import './augmentations';

import { accountManagementStoreContract } from '@lace-contract/account-management';
import { activitiesStoreContract } from '@lace-contract/activities';
import { addressBookStoreContract } from '@lace-contract/address-book';
import { addressesStoreContract } from '@lace-contract/addresses';
import {
  appStoreContract,
  blockchainSpecificAppCustomizationsAddonContract,
  tabMenuItemsAddonContract,
} from '@lace-contract/app';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import { customDappsStoreContract } from '@lace-contract/custom-dapps';
import { dappConnectorStoreContract } from '@lace-contract/dapp-connector';
import { failuresStoreContract } from '@lace-contract/failures';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { notificationCenterStoreContract } from '@lace-contract/notification-center';
import { onboardingStartWalletDropdownAddonContract } from '@lace-contract/onboarding-v2';
import { onlineStatusStoreContract } from '@lace-contract/online-status';
import { sendFlowStoreContract } from '@lace-contract/send-flow';
import { signerStoreContract } from '@lace-contract/signer';
import { storageDependencyContract } from '@lace-contract/storage';
import { syncStoreContract } from '@lace-contract/sync';
import { tokenPricingStoreContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';
import {
  stackPagesAddonContract,
  tabPagesAddonContract,
  sheetPagesAddonContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  LaceModuleMap,
  LaceSideEffect,
  ModuleActionCreators,
  ModuleAddons,
  ModuleSelectors,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  addressBookStoreContract,
  networkStoreContract,
  activitiesStoreContract,
  appStoreContract,
  failuresStoreContract,
  stackPagesAddonContract,
  tabPagesAddonContract,
  sendFlowStoreContract,
  sheetPagesAddonContract,
  tabMenuItemsAddonContract,
  tokensStoreContract,
  txExecutorStoreContract,
  walletRepoStoreContract,
  customDappsStoreContract,
  dappConnectorStoreContract,
  signerStoreContract,
  onlineStatusStoreContract,
] as const);
const dependsOnContracts = combineContracts([
  accountManagementStoreContract,
  addressesStoreContract,
  authenticationPromptStoreContract,
  blockchainSpecificAppCustomizationsAddonContract,
  cardanoProviderStoreContract,
  featureStoreContract,
  notificationCenterStoreContract,
  onboardingStartWalletDropdownAddonContract,
  storageDependencyContract,
  syncStoreContract,
  tokenPricingStoreContract,
] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('app-mobile'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadStackPages: async () => import('./addons/loadStackPages'),
    loadTabPages: async () => import('./addons/loadTabPages'),
    loadSheetPages: async () => import('./addons/loadSheetPages'),
    loadTabMenuItems: async () => import('./addons/loadTabMenuItems'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': multiPlatformModule,
  'lace-extension': multiPlatformModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof multiPlatformModule>;
export type ActionCreators = ModuleActionCreators<typeof multiPlatformModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;

export type { IconConfig, ToastConfig } from './store/slice';

// Cross-module reusable security-alert UI lives outside app-mobile:
// visual atoms + compound in `@lace-lib/ui-toolkit` (chip / disclosure /
// inline), and the redux-driven `useAccountSecurityAlert` hook in
// `@lace-contract/cardano-context`. Callers on other modules or the
// extension import from those packages directly to avoid the
// `scope:module → scope:module` boundary violation and the react-native
// static-import chain that would otherwise leak into the extension
// bundle's rollup parse phase.
