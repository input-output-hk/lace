import {
  combineContracts,
  combineStore,
  ContractName,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { tokensStoreContract } from '@lace-contract/tokens';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import { cardanoProviderStoreContract } from '../contract';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

/**
 * Owns the custody account actions and selectors in the `cardanoCustody`
 * scope, and tracks the tokens of custody accounts. A wallet carries them
 * only when it loads a module that implements this contract, next to one
 * that implements `cardanoProviderStoreContract`.
 */
export const cardanoCustodyStoreContract = inferContractContext({
  name: ContractName('cardano-custody-store'),
  instance: 'exactly-one',
  contractType: 'store',
  dependsOn: combineContracts([
    cardanoProviderStoreContract,
    tokensStoreContract,
    walletRepoStoreContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

/** The selectors the custody store's side effects read. */
export type CardanoCustodySelectors = ContractSelectors<
  typeof cardanoCustodyStoreContract
>;
/** The action creators the custody store's side effects observe and emit. */
export type CardanoCustodyActionCreators = ContractActionCreators<
  typeof cardanoCustodyStoreContract
>;
/** A side effect over the custody store and the contracts it depends on. */
export type CardanoCustodySideEffect = LaceSideEffect<
  CardanoCustodySelectors,
  CardanoCustodyActionCreators
>;
