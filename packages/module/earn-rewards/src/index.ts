import './augmentations';

import { activitiesStoreContract } from '@lace-contract/activities';
import { portfolioAnnouncementsAddonContract } from '@lace-contract/app';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import { cardanoStakePoolsStoreContract } from '@lace-contract/cardano-stake-pools';
import {
  earnRewardsStoreContract,
  FEATURE_FLAG_EARN_REWARDS,
} from '@lace-contract/earn-rewards';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { tokensStoreContract } from '@lace-contract/tokens';
import { sheetPagesAddonContract } from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  ContractsActionCreators,
  ContractsSelectors,
  LaceModuleMap,
  LaceSideEffect,
  ModuleAddons,
  ModuleStoreActionCreators,
  ModuleStoreSelectors,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  earnRewardsStoreContract,
  sheetPagesAddonContract,
  portfolioAnnouncementsAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  activitiesStoreContract,
  cardanoProviderStoreContract,
  cardanoStakePoolsStoreContract,
  featureStoreContract,
  networkStoreContract,
  tokensStoreContract,
  walletRepoStoreContract,
] as const);

const sharedModule = inferModuleContext({
  moduleName: ModuleName('earn-rewards'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_EARN_REWARDS),
    metadata: {
      name: 'EarnRewards',
      description: 'One-tap stake + governance delegation to earn rewards',
    },
  },
  addons: {
    loadSheetPages: async () => import('./addons/sheetPages'),
    loadPortfolioAnnouncements: async () =>
      import('./addons/load-portfolio-announcements'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': sharedModule,
  'lace-mobile': sharedModule,
};

export default moduleMap;

// Built part-wise, NOT ModuleSelectors/ModuleActionCreators<typeof
// sharedModule>: a `typeof sharedModule` reference makes declaration emit
// serialize the whole inferred LaceModule as ONE node, which exceeds the
// compiler's serialization cap (TS7056) — same workaround as
// blockchain-cardano's module map.
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
