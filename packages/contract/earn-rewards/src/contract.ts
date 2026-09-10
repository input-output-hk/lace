import {
  cardanoProviderStoreContract,
  earnRewardsTxBuilderAddonContract,
} from '@lace-contract/cardano-context';
import { cardanoStakePoolsStoreContract } from '@lace-contract/cardano-stake-pools';
import { featureStoreContract } from '@lace-contract/feature';
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

export const earnRewardsStoreContract = inferContractContext({
  name: ContractName('earn-rewards-store'),
  contractType: 'store',
  instance: 'exactly-one',
  dependsOn: combineContracts([
    cardanoProviderStoreContract,
    // Pool selection lands in the stake-pools slice, and the consumption side
    // effect resolves the promoted target from the feature flags — both read
    // here so the handshake works wherever this contract is loaded.
    cardanoStakePoolsStoreContract,
    featureStoreContract,
    txExecutorStoreContract,
    walletRepoStoreContract,
    earnRewardsTxBuilderAddonContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof earnRewardsStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof earnRewardsStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
