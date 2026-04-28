import { activitiesStoreContract } from '@lace-contract/activities';
import { addressesStoreContract } from '@lace-contract/addresses';
import { failuresStoreContract } from '@lace-contract/failures';
import {
  combineContracts,
  combineStore,
  ContractName,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { syncStoreContract } from '@lace-contract/sync';
import { tokensStoreContract } from '@lace-contract/tokens';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  ActionType,
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

// Provides cardano provider dependencies to side effects
// SideEffectDependencies: cardanoProvider (getTip, getProtocolParameters, getEraSummaries, discoverAddresses, etc.)
export const cardanoProviderDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('cardano-provider-dependency'),
  instance: 'exactly-one',
});

// Provides in-memory transaction signing to side effects
// SideEffectDependencies: cardanoInMemorySigning.signTransaction
export const cardanoInMemorySigningDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('cardano-in-memory-signing-dependency'),
  instance: 'exactly-one',
});

/**
 * Implementor must provide sideEffectDependencies (CardanoProviderDependencies)
 */
export const cardanoProviderStoreContract = inferContractContext({
  name: ContractName('cardano-provider-store'),
  instance: 'exactly-one',
  contractType: 'store',
  dependsOn: combineContracts([
    networkStoreContract,
    activitiesStoreContract,
    addressesStoreContract,
    tokensStoreContract,
    walletRepoStoreContract,
    cardanoProviderDependencyContract,
    syncStoreContract,
    failuresStoreContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export const delegationTxBuilderAddonContract = inferContractContext({
  name: ContractName('delegation-tx-builder-addon'),
  instance: 'at-least-one',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadDelegationTxBuilder'],
  },
});

export const deregistrationTxBuilderAddonContract = inferContractContext({
  name: ContractName('deregistration-tx-builder-addon'),
  instance: 'at-least-one',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadDeregistrationTxBuilder'],
  },
});

export type Selectors = ContractSelectors<typeof cardanoProviderStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof cardanoProviderStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type Action = ActionType<ActionCreators>;
