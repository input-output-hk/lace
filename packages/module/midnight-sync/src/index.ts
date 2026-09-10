import { activitiesStoreContract } from '@lace-contract/activities';
import { addressesStoreContract } from '@lace-contract/addresses';
import { appStoreContract } from '@lace-contract/app';
import { appLockStoreContract } from '@lace-contract/app-lock';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
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
import { signerFactoryAddonContract } from '@lace-contract/signer';
import { syncStoreContract } from '@lace-contract/sync';
import { tokensStoreContract } from '@lace-contract/tokens';
import {
  txExecutorStoreContract,
  txExecutorImplementationAddonContract,
} from '@lace-contract/tx-executor';
import { walletActiveStateDependencyContract } from '@lace-contract/wallet-active-state';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import { FEATURE_FLAG_MIDNIGHT } from './const';
import store from './store';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  LaceModuleMap,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  inMemoryIntegrationAddonContract,
  tokensStoreContract,
  syncStoreContract,
  addressesStoreContract,
  midnightDependencyContract,
  txExecutorImplementationAddonContract,
  signerFactoryAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  activitiesStoreContract,
  appStoreContract,
  appLockStoreContract,
  featureStoreContract,
  midnightContextStoreContract,
  walletActiveStateDependencyContract,
  walletRepoStoreContract,
  authenticationPromptStoreContract,
  txExecutorStoreContract,
] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('midnight-sync'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_MIDNIGHT),
    metadata: {
      name: 'MidnightSync',
      description: 'Midnight engine, wallet lifecycle, tx executor and signer',
    },
  },
  addons: {
    loadTxExecutorImplementation: async () =>
      import('./exported-modules/tx-executor-implementation'),
    loadSignerFactory: async () => import('./exported-modules/signer-factory'),
    loadInMemoryWalletIntegration: async () =>
      import('./exported-modules/in-memory-wallet-integration').then(
        module => ({ default: module.inMemoryWalletIntegrationReactNative }),
      ),
  },
});

// Monolith-only, unlike the UI module (@lace-module/blockchain-midnight, which
// also registers 'lace-mobile' and 'lace-extension-guest'): this module IS the
// engine, and mobile Midnight is off by design while the guest pulls its state
// from the host (@lace-module/midnight-host-pull). Re-enabling Midnight on
// mobile therefore means adding 'lace-mobile' HERE too — the UI module alone
// would ship a surface with no engine behind it.
const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
