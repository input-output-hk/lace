import type { ReactNode } from 'react';

import { activitiesStoreContract } from '@lace-contract/activities';
import { addressesStoreContract } from '@lace-contract/addresses';
import {
  appStoreContract,
  tokenDetailsUICustomisationsAddonContract,
} from '@lace-contract/app';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import { failuresStoreContract } from '@lace-contract/failures';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import {
  hasAnyRealFiNetwork,
  realfiProviderDependencyContract,
  realfiStakingStoreContract,
} from '@lace-contract/realfi-staking';
import { stakingCenterProductCardAddonContract } from '@lace-contract/staking-center';
import { tokenPricingStoreContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';
import {
  sheetPagesAddonContract,
  stackPagesAddonContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type * as _ from '@lace-contract/feature';
import type {
  ContextualDynamicallyLoadedInit,
  ContractsActionCreators,
  ContractsSelectors,
  LaceModuleMap,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  realfiStakingStoreContract,
  realfiProviderDependencyContract,
  stakingCenterProductCardAddonContract,
  // Carries loadTokenDetailsUICustomisations — the USDr Token Detail
  // "Manage Stake" entry point (LW-14650 AC 1).
  tokenDetailsUICustomisationsAddonContract,
  sheetPagesAddonContract,
  stackPagesAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  appStoreContract,
  walletRepoStoreContract,
  cardanoProviderStoreContract,
  txExecutorStoreContract,
  tokensStoreContract,
  tokenPricingStoreContract,
  networkStoreContract,
  featureStoreContract,
  activitiesStoreContract,
  addressesStoreContract,
  failuresStoreContract,
] as const);

// Annotated with the registered addon type (LaceAddons) so declaration emit
// prints this alias instead of inlining every page component's prop tree into
// `sharedModule`'s serialized type — which overflows the compiler's limit
// (TS7056) as the module grows.
const loadSheetPages: ContextualDynamicallyLoadedInit<
  ReactNode,
  AvailableAddons
> = async () => import('./addons/sheetPages');
const loadStackPages: ContextualDynamicallyLoadedInit<
  ReactNode,
  AvailableAddons
> = async () => import('./addons/stackPages');

const sharedModule = inferModuleContext({
  moduleName: ModuleName('realfi-cardano'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  feature: {
    // PostHog gates delivery by geographical region / device type; a delivered
    // REALFI flag enables the feature on whichever networks its payload
    // defines. No network resolving to a valid config → nothing to load (the
    // USDr staking centre must not appear when no network could serve it).
    willLoad: featureFlags => hasAnyRealFiNetwork(featureFlags),
    metadata: {
      name: 'RealFiCardano',
      description: 'RealFi USDr staking (Earn) for Cardano',
    },
  },
  addons: {
    loadSheetPages,
    loadStackPages,
    // No fetch here: the card's APY + vault rate come from the persisted
    // store's yield info, mirrored into the module cache by the
    // makeYieldInfoCache side-effect (warm from rehydrate at boot, refreshed
    // by makeStakingYieldPrime) — the same figures the USDr detail screen
    // selects, so both surfaces always present one value.
    loadStakingCenterProductCard: async () =>
      import('./addons/stakingCenterProductCard'),
    // USDr Token Detail → "Manage Stake" entry (LW-14650 AC 1), contributed
    // above the token's activity list via the shared customisation seam.
    loadTokenDetailsUICustomisations: async () =>
      import('./exported-modules/token-details-ui-customization'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': sharedModule,
  'lace-mobile': sharedModule,
};

export default moduleMap;

// Derived from the contract sets rather than `typeof sharedModule`, which would
// overflow declaration emit (TS7056 — see the helpers' docblock). No store term
// here: this module's store generics are defaulted, so its selectors and action
// creators reach these types through the store contract instead.
export type Selectors = ContractsSelectors<typeof dependsOnContracts> &
  ContractsSelectors<typeof implementsContracts>;
export type ActionCreators = ContractsActionCreators<
  typeof implementsContracts
> &
  ContractsActionCreators<typeof dependsOnContracts>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
