import { activitiesStoreContract } from '@lace-contract/activities';
import { addressesStoreContract } from '@lace-contract/addresses';
import { appStoreContract } from '@lace-contract/app';
import { appLockStoreContract } from '@lace-contract/app-lock';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import { failuresStoreContract } from '@lace-contract/failures';
import { featureStoreContract } from '@lace-contract/feature';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import {
  midnightContextStoreContract,
  midnightDependencyContract,
} from '@lace-contract/midnight-context';
import { combineContracts } from '@lace-contract/module';
import { signerFactoryAddonContract } from '@lace-contract/signer';
import { syncStoreContract } from '@lace-contract/sync';
import { tokensStoreContract } from '@lace-contract/tokens';
import {
  txExecutorStoreContract,
  txExecutorImplementationAddonContract,
} from '@lace-contract/tx-executor';
import { walletActiveStateDependencyContract } from '@lace-contract/wallet-active-state';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import type { midnightSyncActions } from './store/actions';
import type {
  ContractsActionCreators,
  ContractsSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

// Keep side-effect types separate from the store, whose app init loads Temenos.
// Headless loadouts must not reach that app initialization.
export const implementsContracts = combineContracts([
  inMemoryIntegrationAddonContract,
  tokensStoreContract,
  syncStoreContract,
  addressesStoreContract,
  midnightDependencyContract,
  txExecutorImplementationAddonContract,
  signerFactoryAddonContract,
] as const);

export const dependsOnContracts = combineContracts([
  activitiesStoreContract,
  appStoreContract,
  appLockStoreContract,
  failuresStoreContract,
  featureStoreContract,
  midnightContextStoreContract,
  walletActiveStateDependencyContract,
  walletRepoStoreContract,
  authenticationPromptStoreContract,
  txExecutorStoreContract,
] as const);

export type Selectors = ContractsSelectors<typeof dependsOnContracts> &
  ContractsSelectors<typeof implementsContracts>;
export type ActionCreators = ContractsActionCreators<
  typeof dependsOnContracts
> &
  ContractsActionCreators<typeof implementsContracts> &
  typeof midnightSyncActions;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
