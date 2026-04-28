import { featureStoreContract } from '@lace-contract/feature';
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

export const networkStoreContract = inferContractContext({
  name: ContractName('network-store'),
  contractType: 'store',
  instance: 'exactly-one',
  dependsOn: combineContracts([featureStoreContract] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof networkStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof networkStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
