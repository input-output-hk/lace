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

// Provides secure store dependencies to side effects
// SideEffectDependencies: secureStore (getItem, setItem, canUseBiometricAuthentication, isAvailableAsync)
export const secureStoreDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('secure-store-dependency'),
  instance: 'exactly-one',
});

export const secureStoreContract = inferContractContext({
  contractType: 'store',
  name: ContractName('secure-store'),
  instance: 'exactly-one',
  dependsOn: combineContracts([secureStoreDependencyContract] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export const secureStoreAddonContract = inferContractContext({
  contractType: 'addon',
  name: ContractName('secure-store-addon'),
  instance: 'exactly-one',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadSecureStore'],
  },
});

export type Selectors = ContractSelectors<typeof secureStoreContract>;
export type ActionCreators = ContractActionCreators<typeof secureStoreContract>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
