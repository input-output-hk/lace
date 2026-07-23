import type { cardanoContextReducers } from './store/slice';
import type {
  CardanoInMemorySigningDependencies,
  CardanoProviderDependencies,
  CardanoProviderConfig,
  CardanoSpecificInMemoryWalletData,
  CardanoSideEffectsDependencies,
  MakeBuildDelegationTx,
  MakeBuildDeregistrationTx,
  MakeBuildVoteDelegationTx,
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

/**
 * Extra metadata for activities classified as
 * `ActivityType.NightDesignation`. Surfaced on both pending and
 * confirmed activities so the UI can render the operation variant
 * (designate / update / deregister) and the target dust pubkey
 * without re-parsing the tx CBOR.
 *
 * `dustPubkeyHex` is 32-byte hex when the action is `designate` or
 * `update` (carries the Midnight coin pubkey written into the new
 * `DustMappingDatum`). Absent for `deregister` — there's no new
 * datum, the existing one is burned with the NFT.
 */
export type CardanoNightDesignationActivityMetadata = {
  action: 'deregister' | 'designate' | 'update';
  dustPubkeyHex?: string;
};

export type CardanoActivityBlockchainSpecific =
  CardanoInFlightUtxoActivityMetadata & {
    nightDesignation?: CardanoNightDesignationActivityMetadata;
  };

declare module '@lace-contract/activities' {
  interface BlockchainSpecificActivityMetadata {
    Cardano?: CardanoActivityBlockchainSpecific;
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
    readonly loadVoteDelegationTxBuilder: DynamicallyLoadedInit<MakeBuildVoteDelegationTx>;
  }
}

declare module '@lace-contract/wallet-repo' {
  interface BlockchainSpecificInMemoryWalletData {
    Cardano?: CardanoSpecificInMemoryWalletData;
  }
}
