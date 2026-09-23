import { activitiesStoreContract } from '@lace-contract/activities';
import { addressesStoreContract } from '@lace-contract/addresses';
import { analyticsStoreContract } from '@lace-contract/analytics';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import { failuresStoreContract } from '@lace-contract/failures';
import { featureStoreContract } from '@lace-contract/feature';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { swapProviderDependencyContract } from '@lace-contract/swap-provider';
import { tokenPricingStoreContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import { realfiProviderDependencyContract } from './provider-contract';
import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const realfiStakingStoreContract = inferContractContext({
  name: ContractName('realfi-staking-store'),
  contractType: 'store',
  instance: 'exactly-one',
  dependsOn: combineContracts([
    addressesStoreContract,
    authenticationPromptStoreContract,
    cardanoProviderStoreContract,
    txExecutorStoreContract,
    walletRepoStoreContract,
    tokensStoreContract,
    tokenPricingStoreContract,
    analyticsStoreContract,
    networkStoreContract,
    featureStoreContract,
    failuresStoreContract,
    activitiesStoreContract,
    swapProviderDependencyContract,
    realfiProviderDependencyContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof realfiStakingStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof realfiStakingStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
