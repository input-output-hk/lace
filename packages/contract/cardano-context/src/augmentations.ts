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

export type CardanoActivitySecurityMetadata = {
  exploits?: {
    /**
     * SecondFi/Yoroi June 2026 wallet compromise — Ed25519 private-key
     * disclosure via deterministic public nonce. See
     * src/security/exploits/deterministicNonce202606/.
     */
    deterministicNonce202606?: boolean;
  };
};

export type CardanoInFlightUtxoActivityMetadata = {
  consumedInputs: Cardano.TxIn[];
  producedOutputs: Cardano.Utxo[];
  /**
   * Slot of the block that included the on-chain tx behind this activity.
   * Absent on Pending activities and on activities persisted before this
   * field was introduced.
   */
  slot?: Cardano.Slot;
  security?: CardanoActivitySecurityMetadata;
};

declare module '@lace-contract/activities' {
  interface BlockchainSpecificActivityMetadata {
    Cardano?: CardanoInFlightUtxoActivityMetadata;
  }
}

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
