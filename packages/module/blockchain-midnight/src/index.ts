import './augmentations';

import { accountSettingsUIAddonContract } from '@lace-contract/account-management';
import {
  activitiesDetailsSheetCustomizationsAddonContract,
  activitiesStoreContract,
} from '@lace-contract/activities';
import { addressBookAddressValidatorAddonContract } from '@lace-contract/address-book';
import { addressesStoreContract } from '@lace-contract/addresses';
import {
  appStoreContract,
  dialogsAddonContract,
  blockchainSpecificAppCustomizationsAddonContract,
  blockchainSpecificAppSettingsPageCustomizationsAddonContract,
  sendFlowSheetUICustomisationAddonContract,
} from '@lace-contract/app';
import { appLockStoreContract } from '@lace-contract/app-lock';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import { dappConnectorStoreContract } from '@lace-contract/dapp-connector';
import { failuresStoreContract } from '@lace-contract/failures';
import { featureStoreContract } from '@lace-contract/feature';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import {
  midnightContextStoreContract,
  midnightDependencyContract,
} from '@lace-contract/midnight-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  addressValidatorAddonContract,
  sendFlowAnalyticsEnhancerAddonContract,
  sendFlowStoreContract,
} from '@lace-contract/send-flow';
import { signerFactoryAddonContract } from '@lace-contract/signer';
import { syncStoreContract } from '@lace-contract/sync';
import { tokenPricingStoreContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import {
  txExecutorStoreContract,
  txExecutorImplementationAddonContract,
} from '@lace-contract/tx-executor';
import {
  viewsStoreContract,
  sheetPagesAddonContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import { FEATURE_FLAG_MIDNIGHT } from './const';
import store from './store';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  LaceModuleMap,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  accountSettingsUIAddonContract,
  inMemoryIntegrationAddonContract,
  tokensStoreContract,
  syncStoreContract,
  addressesStoreContract,
  midnightContextStoreContract,
  midnightDependencyContract,
  blockchainSpecificAppCustomizationsAddonContract,
  blockchainSpecificAppSettingsPageCustomizationsAddonContract,
  sendFlowSheetUICustomisationAddonContract,
  activitiesDetailsSheetCustomizationsAddonContract,
  addressValidatorAddonContract,
  sendFlowAnalyticsEnhancerAddonContract,
  txExecutorImplementationAddonContract,
  addressBookAddressValidatorAddonContract,
  signerFactoryAddonContract,
  sheetPagesAddonContract,
  dialogsAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  activitiesStoreContract,
  appLockStoreContract,
  appStoreContract,
  dappConnectorStoreContract,
  featureStoreContract,
  walletRepoStoreContract,
  viewsStoreContract,
  authenticationPromptStoreContract,
  txExecutorStoreContract,
  failuresStoreContract,
  sendFlowStoreContract,
  tokenPricingStoreContract,
] as const);

const reactNativeModule = inferModuleContext({
  moduleName: ModuleName('blockchain-midnight'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_MIDNIGHT),
    metadata: {
      name: 'Midnight',
      description: 'Midnight blockchain support',
    },
  },
  addons: {
    // make the naming prefix consistent: add/remove 'load' to all properties
    loadAddressValidator: async () =>
      import('./exported-modules/address-validator'),
    loadSendFlowAnalyticsEnhancers: async () =>
      import('./exported-modules/send-flow-analytics-enhancer'),
    loadTxExecutorImplementation: async () =>
      import('./exported-modules/tx-executor-implementation'),
    loadPortfolioBannerUICustomisations: async () =>
      import('./exported-modules/portfolio-banner-customisation'),
    loadReceiveSheetAddressDataCustomisations: async () =>
      import('./exported-modules/receive-sheet-address-data-customisation'),
    loadActivityDetailsSheetUICustomisations: async () =>
      import('./exported-modules/activity-details-sheet-ui-customisation').then(
        module => ({ default: module.activityDetailsSheetUICustomisation }),
      ),
    loadAddressBookAddressValidators: async () =>
      import('./exported-modules/address-book-address-validator'),
    loadSignerFactory: async () => import('./exported-modules/signer-factory'),
    loadAccountUICustomisations: async () =>
      import('./exported-modules/account-ui-customisation'),
    loadSendFlowSheetUICustomisations: async () =>
      import('./exported-modules/send-flow-sheet-ui-customization'),
    loadInMemoryWalletIntegration: async () =>
      import('./exported-modules/in-memory-wallet-integration').then(
        module => ({ default: module.inMemoryWalletIntegrationReactNative }),
      ),
    loadTokenDetailsUICustomisations: async () =>
      import(
        './exported-modules/token-details-ui-customization/react-native'
      ).then(module => ({
        default: module.tokenDetailsUICustomizationReactNative,
      })),
    loadSettingsPageUICustomisations: async () =>
      import('./customisations/settings/settings-page-ui-customisation'),
    loadSheetPages: async () => import('./customisations/settings/sheetPages'),
    loadAboutPageUICustomisations: async () =>
      import('./exported-modules/about-page-ui-customisation'),
    loadDialogs: async () => import('./exported-modules/dialogs/v2'),
    loadAccountSettingsUICustomisations: async () =>
      import('./exported-modules/account-settings'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': reactNativeModule,
  'lace-extension': reactNativeModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof reactNativeModule>;
export type ActionCreators = ModuleActionCreators<typeof reactNativeModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
