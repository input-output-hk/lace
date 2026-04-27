import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { storageDependencyContract } from '@lace-contract/storage';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
} from '@lace-contract/module';

// Provides feature flag management and dynamic feature configuration capabilities
// SideEffectDependencies: FeatureFlagProvider (featureFlags$ - observable stream of feature flags)
export const featureDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('feature-dependency'),
  instance: 'exactly-one',
});

export const featureStoreContract = inferContractContext({
  contractType: 'store',
  name: ContractName('feature-store'),
  instance: 'exactly-one',
  dependsOn: combineContracts([storageDependencyContract] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof featureStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof featureStoreContract
>;
