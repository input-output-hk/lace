import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { storageDependencyContract } from '@lace-contract/storage';
import { syncStoreContract } from '@lace-contract/sync';
import { tokensStoreContract } from '@lace-contract/tokens';

import store from './store';

import type {
  ContractSelectors,
  ContractActionCreators,
  LaceSideEffect,
} from '@lace-contract/module';

// Provides token pricing provider dependencies to side effects
// SideEffectDependencies: tokenPricingProvider (fetchPrices)
export const tokenPricingProviderDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('token-pricing-provider-dependency'),
  instance: 'zero-or-more',
});

/**
 * Addon contract for blockchain-specific token ID mappers.
 * Each blockchain module implements this to provide its own token-to-price-id mapping.
 */
export const tokenIdMapperAddonContract = inferContractContext({
  name: ContractName('token-id-mapper-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadTokenIdMapper'],
  },
});

export const tokenPricingStoreContract = inferContractContext({
  name: ContractName('token-pricing-store'),
  contractType: 'store',
  dependsOn: combineContracts([
    storageDependencyContract,
    networkStoreContract,
    tokensStoreContract,
    syncStoreContract,
    tokenPricingProviderDependencyContract,
    tokenIdMapperAddonContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
  instance: 'zero-or-more',
});

export type Selectors = ContractSelectors<typeof tokenPricingStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof tokenPricingStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
