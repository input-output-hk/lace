import { analyticsStoreContract } from '@lace-contract/analytics';
import { featureStoreContract } from '@lace-contract/feature';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { tokensStoreContract } from '@lace-contract/tokens';
import { viewsStoreContract } from '@lace-contract/views';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
} from '@lace-contract/module';

export const profileDropdownWalletsAddonContract = inferContractContext({
  name: ContractName('profile-dropdown-wallets-addon'),
  contractType: 'addon',
  instance: 'zero-or-more',
  provides: {
    addons: [
      'loadProfileDropdownWalletsUICustomisations',
      'loadProfileDropdownMenuItemUICustomisations',
    ],
  },
});

export const blockchainSpecificAppCustomizationsAddonContract =
  inferContractContext({
    name: ContractName('blockchain-specific-app-customizations-addon'),
    instance: 'zero-or-more',
    contractType: 'addon',
    provides: {
      addons: [
        'loadAccountUICustomisations',
        'loadReceiveSheetAddressDataCustomisations',
        'loadTokenDetailsUICustomisations',
        'loadPortfolioBannerUICustomisations',
        'loadAboutPageUICustomisations',
      ],
    },
  });

export const blockchainSpecificAppSettingsPageCustomizationsAddonContract =
  inferContractContext({
    name: ContractName(
      'blockchain-specific-app-settings-page-customizations-addon',
    ),
    instance: 'zero-or-more',
    contractType: 'addon',
    provides: {
      addons: ['loadSettingsPageUICustomisations'],
    },
  });

export const dialogsAddonContract = inferContractContext({
  name: ContractName('dialogs-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadDialogs'],
  },
});

export const accountUICustomisationAddonContract = inferContractContext({
  name: ContractName('account-ui-customisation-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadAccountUICustomisations'],
  },
});

export const sendFlowSheetUICustomisationAddonContract = inferContractContext({
  name: ContractName('send-flow-sheet-ui-customisation-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadSendFlowSheetUICustomisations'],
  },
});

export const appContextInitializationAddonContract = inferContractContext({
  name: ContractName('app-context-initialization-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadInitializeAppContext'],
  },
});

export const appMenuItemsAddonContract = inferContractContext({
  name: ContractName('app-menu-items-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadAppMenuItems'],
  },
});

export const tabMenuItemsAddonContract = inferContractContext({
  name: ContractName('tab-menu-items-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadTabMenuItems'],
  },
});

export const appStoreContract = inferContractContext({
  name: ContractName('app-store'),
  instance: 'exactly-one',
  contractType: 'store',
  dependsOn: combineContracts([
    viewsStoreContract,
    appContextInitializationAddonContract,
    appMenuItemsAddonContract,
    tabMenuItemsAddonContract,
    analyticsStoreContract,
    featureStoreContract,
    tokensStoreContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

// Provides app runtime dependencies to side effects
// SideEffectDependencies: reloadExtension
export const appRuntimeDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('app-runtime-dependency'),
  instance: 'exactly-one',
});

export type Selectors = ContractSelectors<typeof appStoreContract>;
export type ActionCreators = ContractActionCreators<typeof appStoreContract>;
