import { accountSettingsUIAddonContract } from '@lace-contract/account-management';
import {
  activitiesDetailsSheetCustomizationsAddonContract,
  activitiesStoreContract,
} from '@lace-contract/activities';
import { addressesStoreContract } from '@lace-contract/addresses';
import { appStoreContract } from '@lace-contract/app';
import {
  FEATURE_FLAG_CARDANO,
  cardanoProviderStoreContract,
} from '@lace-contract/cardano-context';
import { cardanoStakePoolsStoreContract } from '@lace-contract/cardano-stake-pools';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { tokenPricingStoreContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import {
  viewsStoreContract,
  sheetPagesAddonContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  accountSettingsUIAddonContract,
  activitiesDetailsSheetCustomizationsAddonContract,
  sheetPagesAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  featureStoreContract,
  activitiesStoreContract,
  viewsStoreContract,
  walletRepoStoreContract,
  addressesStoreContract,
  appStoreContract,
  cardanoProviderStoreContract,
  cardanoStakePoolsStoreContract,
  tokenPricingStoreContract,
  tokensStoreContract,
] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('blockchain-cardano-ui'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  addons: {
    loadAccountSettingsUICustomisations: async () =>
      import('./addons/account-settings'),
    loadActivityDetailsSheetUICustomisations: async () =>
      import('./addons/activity-details-sheet-ui-customisation').then(
        module => ({ default: module.activityDetailsSheetUICustomisation }),
      ),
    loadSheetPages: async () => import('./addons/sheetPages'),
  },
  feature: {
    metadata: { name: 'Cardano-UI', description: 'UI module for Cardano' },
    willLoad: featureFlags =>
      featureFlags.map(({ key }) => key).includes(FEATURE_FLAG_CARDANO),
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
