import {
  cardanoProviderStoreContract,
  delegationTxBuilderAddonContract,
} from '@lace-contract/cardano-context';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const stakingCenterStoreContract = inferContractContext({
  name: ContractName('staking-center-store'),
  contractType: 'store',
  instance: 'exactly-one',
  dependsOn: combineContracts([
    cardanoProviderStoreContract,
    txExecutorStoreContract,
    walletRepoStoreContract,
    delegationTxBuilderAddonContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof stakingCenterStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof stakingCenterStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
