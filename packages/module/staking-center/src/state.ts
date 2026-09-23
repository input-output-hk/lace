import { appStoreContract } from '@lace-contract/app';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import { cardanoStakePoolsStoreContract } from '@lace-contract/cardano-stake-pools';
import { failuresStoreContract } from '@lace-contract/failures';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import {
  FEATURE_FLAG_STAKING_CENTER,
  stakingCenterStoreContract,
} from '@lace-contract/staking-center';
import { tokenPricingStoreContract } from '@lace-contract/token-pricing';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';
import {
  initializeExtensionViewAddonContract,
  initializeMobileViewAddonContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type * as _ from '@lace-contract/feature';
import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: the same store, feature gate and
// dependencies, WITHOUT the tab/sheet page addons. Those addons are react-native
// presentation, and an addon thunk is a live property of the module object —
// nothing static can remove it — so an ESM bundler emits a chunk for every one
// of them and parses the whole react-native chain behind it. A DOM guest
// therefore consumes this entry and renders its own UI over the same redux
// state. The contract lists are stated again rather than shared with `./index`:
// sharing them would make the default entry import this file, and the two
// `implements` lists genuinely differ (the page-addon contracts are absent here,
// because `addons` is required for every contract a module implements).
const implementsContracts = combineContracts([
  initializeExtensionViewAddonContract,
  initializeMobileViewAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  appStoreContract,
  stakingCenterStoreContract,
  walletRepoStoreContract,
  cardanoProviderStoreContract,
  txExecutorStoreContract,
  tokenPricingStoreContract,
  networkStoreContract,
  cardanoStakePoolsStoreContract,
  failuresStoreContract,
] as const);

const stateModule = inferModuleContext({
  moduleName: ModuleName('staking-center'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_STAKING_CENTER),
    metadata: {
      name: 'StakingCenter',
      description: 'Staking management for Cardano',
    },
  },
  addons: {
    loadInitializeExtensionView: async () => import('./initialize-view'),
    loadInitializeMobileView: async () => import('./initialize-view'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;
