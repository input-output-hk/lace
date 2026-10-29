import { failuresStoreContract } from '@lace-contract/failures';
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

import './types';

export const activitiesStoreContract = inferContractContext({
  name: ContractName('activities-store'),
  contractType: 'store',
  instance: 'exactly-one',
  dependsOn: combineContracts([failuresStoreContract] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof activitiesStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof activitiesStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
