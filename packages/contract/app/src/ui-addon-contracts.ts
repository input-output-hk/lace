// The addon contracts through which the app's UI is customised and
// assembled. The stable SDK build resolves ui-addon-contracts.stable.ts
// instead: the SDK runs headless and loads none of them.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.
import { ContractName, inferContractContext } from '@lace-contract/module';

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

/**
 * Narrow seam for product modules that contribute ONLY a token-detail
 * customisation (e.g. RealFi's USDr "Manage Stake" entry) without providing
 * the full blockchain customisation set the
 * blockchain-specific-app-customizations contract requires.
 */
export const tokenDetailsUICustomisationsAddonContract = inferContractContext({
  name: ContractName('token-details-ui-customisations-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadTokenDetailsUICustomisations'],
  },
});

export const portfolioAnnouncementsAddonContract = inferContractContext({
  name: ContractName('portfolio-announcements-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadPortfolioAnnouncements'],
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
