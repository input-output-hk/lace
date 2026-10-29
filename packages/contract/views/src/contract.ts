import { analyticsStoreContract } from '@lace-contract/analytics';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';

import store from './store';
import { viewsUiAddonDependencies } from './ui-addon-dependencies';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const viewsStoreContract = inferContractContext({
  name: ContractName('views-store'),
  instance: 'exactly-one',
  contractType: 'store',
  dependsOn: combineContracts([
    analyticsStoreContract,
    ...viewsUiAddonDependencies,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof viewsStoreContract>;
export type ActionCreators = ContractActionCreators<typeof viewsStoreContract>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
