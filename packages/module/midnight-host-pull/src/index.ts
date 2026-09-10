import './augmentations';

import { activitiesStoreContract } from '@lace-contract/activities';
import { addressesStoreContract } from '@lace-contract/addresses';
import { appStoreContract } from '@lace-contract/app';
import { featureStoreContract } from '@lace-contract/feature';
import {
  midnightContextStoreContract,
  midnightDependencyContract,
} from '@lace-contract/midnight-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { syncStoreContract } from '@lace-contract/sync';
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorImplementationAddonContract } from '@lace-contract/tx-executor';
import { walletActiveStateDependencyContract } from '@lace-contract/wallet-active-state';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import { FEATURE_FLAG_MIDNIGHT } from './const';
import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

// Guest-only (D8): the UI module `blockchain-midnight` (ledger-WASM-free after
// the C2 split) still owns the Midnight slice/UI; this module supplies the
// engine-free half the guest needs. It POLLS `window.lace` for state (watch
// parity, store/side-effects/watch.ts) and implements the tx executor by
// delegating the whole send to the host (exposed-modules/tx-executor-*). It
// depends on the slices it dispatches into (all owned by blockchain-midnight or
// the app in the guest) and provides the `midnightDependencyContract` host-pull
// stubs so the side-effect-dependency shape stays satisfied. Signing is NOT
// implemented here: the host owns the whole send ceremony, so the guest carries
// no Midnight signer factory (dapp data-signing is deferred, ADR 47/D9).
const guestModule = inferModuleContext({
  moduleName: ModuleName('midnight-host-pull'),
  dependsOn: combineContracts([
    activitiesStoreContract,
    addressesStoreContract,
    appStoreContract,
    featureStoreContract,
    midnightContextStoreContract,
    syncStoreContract,
    tokensStoreContract,
    walletActiveStateDependencyContract,
    walletRepoStoreContract,
  ] as const),
  implements: combineContracts([
    midnightDependencyContract,
    txExecutorImplementationAddonContract,
  ] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_MIDNIGHT),
    metadata: {
      name: 'Midnight host-pull',
      description:
        'Guest-side Midnight state pull + send backed by the host engine',
    },
  },
  addons: {
    loadTxExecutorImplementation: async () =>
      import('./exposed-modules/tx-executor-implementation'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension-guest': guestModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof guestModule>;
export type ActionCreators = ModuleActionCreators<typeof guestModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
