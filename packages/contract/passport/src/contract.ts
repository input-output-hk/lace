import {
  ContractName,
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

/**
 * Owns the Passport account state machine: the account's on-chain address
 * and status, its device set, and the current ceremony/deployment flow.
 */
export const passportStoreContract = inferContractContext({
  name: ContractName('passport-store'),
  contractType: 'store',
  instance: 'exactly-one',
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

/**
 * Platform-specific capabilities a Passport module implementation must
 * supply: the device authoriser, fee sponsor, prover, and network
 * endpoints (see PassportDependencies).
 */
export const passportDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('passport-dependency'),
  instance: 'exactly-one',
});

export type Selectors = ContractSelectors<typeof passportStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof passportStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
