import './augmentations';

import { accountSettingsUIAddonContract } from '@lace-contract/account-management';
import {
  activitiesDetailsSheetCustomizationsAddonContract,
  activitiesStoreContract,
} from '@lace-contract/activities';
import { addressesStoreContract } from '@lace-contract/addresses';
import { analyticsStoreContract } from '@lace-contract/analytics';
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
import { syncStoreContract } from '@lace-contract/sync';
import { tokenPricingStoreContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import {
  viewsStoreContract,
  sheetPagesAddonContract,
  globalOverlaysAddonContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  LaceModuleMap,
  ContractsActionCreators,
  ContractsSelectors,
  ModuleStoreActionCreators,
  ModuleStoreSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  accountSettingsUIAddonContract,
  activitiesDetailsSheetCustomizationsAddonContract,
  globalOverlaysAddonContract,
  sheetPagesAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  featureStoreContract,
  activitiesStoreContract,
  analyticsStoreContract,
  syncStoreContract,
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
  store,
  addons: {
    loadAccountSettingsUICustomisations: async () =>
      import('./addons/account-settings'),
    loadActivityDetailsSheetUICustomisations: async () =>
      import('./addons/activity-details-sheet-ui-customisation').then(
        module => ({ default: module.activityDetailsSheetUICustomisation }),
      ),
    loadGlobalOverlays: async () => import('./addons/load-global-overlays'),
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
  'lace-extension-guest': extensionModule,
};

export default moduleMap;

export type Selectors = ContractsSelectors<typeof dependsOnContracts> &
  ContractsSelectors<typeof implementsContracts> &
  ModuleStoreSelectors<typeof store>;
export type ActionCreators = ContractsActionCreators<
  typeof dependsOnContracts
> &
  ContractsActionCreators<typeof implementsContracts> &
  ModuleStoreActionCreators<typeof store>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
