import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

// Provides analytics event tracking capabilities through platform-specific implementations
// SideEffectDependencies: AnalyticsProvider (trackAnalyticsEvent)
export const analyticsProviderDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('analytics-provider-dependency'),
  instance: 'exactly-one',
  // would be nice if framework could validate
  // that implementation of a contract provides specific side-effect dependencies
  // maybe with tsc or maybe runtime validation. In this case, it would have to
  // provide {sideEffectDependencies: AnalyticsProvider}
});

export const analyticsStoreContract = inferContractContext({
  contractType: 'store',
  name: ContractName('analytics-store'),
  instance: 'exactly-one',
  dependsOn: combineContracts([analyticsProviderDependencyContract] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof analyticsStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof analyticsStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
