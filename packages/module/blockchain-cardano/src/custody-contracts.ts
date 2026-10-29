// The contracts the Cardano custody module implements and depends on, and the
// types its side effects are written against.
import {
  cardanoCustodyStoreContract,
  cardanoProviderStoreContract,
} from '@lace-contract/cardano-context';
import { featureStoreContract } from '@lace-contract/feature';
import { combineContracts } from '@lace-contract/module';
import { tokensStoreContract } from '@lace-contract/tokens';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import type {
  Contracts,
  ContractsActionCreators,
  ContractsSelectors,
  LaceModule,
  LaceSideEffect,
} from '@lace-contract/module';

export const custodyImplementsContracts = combineContracts([
  cardanoCustodyStoreContract,
] as const);

export const custodyDependsOnContracts = combineContracts([
  featureStoreContract,
  cardanoProviderStoreContract,
  tokensStoreContract,
  walletRepoStoreContract,
] as const);

type CustodySelectors = ContractsSelectors<typeof custodyDependsOnContracts> &
  ContractsSelectors<typeof custodyImplementsContracts>;
type CustodyActionCreators = ContractsActionCreators<
  typeof custodyDependsOnContracts
> &
  ContractsActionCreators<typeof custodyImplementsContracts>;
export type CustodySideEffect = LaceSideEffect<
  CustodySelectors,
  CustodyActionCreators
>;

type ContractsAddons<T> = T extends Contracts<infer _S, infer _A, infer Addons>
  ? Addons
  : never;

/**
 * The custody module's type, named: inferred, its declaration inlines the
 * Cardano contract once for the module's dependencies and again for the
 * custody contract's, past what the compiler serializes.
 */
export type CustodyModule = LaceModule<
  object,
  object,
  ContractsSelectors<typeof custodyDependsOnContracts>,
  ContractsActionCreators<typeof custodyDependsOnContracts>,
  ContractsSelectors<typeof custodyImplementsContracts>,
  ContractsActionCreators<typeof custodyImplementsContracts>,
  ContractsAddons<typeof custodyImplementsContracts>,
  ContractsAddons<typeof custodyDependsOnContracts>
>;
