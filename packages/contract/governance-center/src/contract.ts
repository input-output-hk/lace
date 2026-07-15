import { analyticsStoreContract } from '@lace-contract/analytics';
import {
  cardanoProviderStoreContract,
  voteDelegationTxBuilderAddonContract,
} from '@lace-contract/cardano-context';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const governanceCenterStoreContract = inferContractContext({
  name: ContractName('governance-center-store'),
  contractType: 'store',
  instance: 'exactly-one',
  dependsOn: combineContracts([
    analyticsStoreContract,
    cardanoProviderStoreContract,
    networkStoreContract,
    txExecutorStoreContract,
    voteDelegationTxBuilderAddonContract,
    walletRepoStoreContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof governanceCenterStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof governanceCenterStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
