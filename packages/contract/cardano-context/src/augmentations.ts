import type { cardanoContextReducers } from './store/slice';
import type {
  CardanoInMemorySigningDependencies,
  CardanoProviderDependencies,
  CardanoProviderConfig,
  CardanoSpecificInMemoryWalletData,
  CardanoSideEffectsDependencies,
  MakeBuildDelegationTx,
  MakeBuildDeregistrationTx,
} from './types';
import type { Cardano } from '@cardano-sdk/core';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

type CardanoDependencies = CardanoInMemorySigningDependencies &
  CardanoProviderDependencies &
  CardanoSideEffectsDependencies;

declare module '@lace-contract/module' {
  interface AppConfig {
    defaultTestnetChainId: Cardano.ChainId;
    cardanoProvider: CardanoProviderConfig;
  }

  interface State
    extends StateFromReducersMapObject<typeof cardanoContextReducers> {}

  interface SideEffectDependencies extends CardanoDependencies {}

  interface LaceAddons {
    readonly loadDelegationTxBuilder: DynamicallyLoadedInit<MakeBuildDelegationTx>;
    readonly loadDeregistrationTxBuilder: DynamicallyLoadedInit<MakeBuildDeregistrationTx>;
  }
}

declare module '@lace-contract/wallet-repo' {
  interface BlockchainSpecificInMemoryWalletData {
    Cardano?: CardanoSpecificInMemoryWalletData;
  }
}
