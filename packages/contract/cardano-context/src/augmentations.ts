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
  MakeBuildEarnRewardsTx,
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

/**
 * UTxO-shaped metadata carried on a Cardano activity. Some fields are
 * populated on PENDING activities only and some on CONFIRMED ones only —
 * each field's doc says which. (Named for the data, not a lifecycle stage:
 * `slot`, `security` and the confirmed outpoints below are not in-flight
 * information.)
 */
export type CardanoActivityUtxoMetadata = {
  /**
   * Every outpoint the transaction spent, NOT only the ones this account owned:
   * on a confirmed activity these come straight off the tx body, with no
   * ownership resolution. Consumers that need "ours" intersect this with the
   * account's own UTxO set, which filters it for free — see
   * `canTrustFetchAsSettled` in cardano-sync, which reads an overlap as proof a
   * provider has not yet applied the transaction.
   *
   * Empty means UNKNOWN, never "spent nothing": activities persisted before
   * confirmed transactions carried this, and Pending activities derived without
   * a resolvable body, both leave it empty. Treat an empty list as no
   * information rather than as evidence.
   */
  consumedInputs: Cardano.TxIn[];
  /** Every output of the signed tx, unfiltered — populated on PENDING
   * activities only; consumers intersect with own addresses at read (see
   * `applyInFlightUtxoAdjustments`). */
  producedOutputs: Cardano.Utxo[];
  /**
   * Outpoints of the confirmed tx's outputs paying addresses the account
   * owned at map time. Outpoints, not full outputs: the one consumer
   * (cardano-sync's missing-output staleness proof) tests membership only,
   * and a dApp batch's datum-carrying outputs are storage it never reads.
   * Empty carries no evidence — legacy activity, or nothing paid to us.
   */
  producedOwnOutpoints?: Cardano.TxIn[];
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

export type CardanoActivityBlockchainSpecific = CardanoActivityUtxoMetadata & {
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
    readonly loadEarnRewardsTxBuilder: DynamicallyLoadedInit<MakeBuildEarnRewardsTx>;
  }
}

declare module '@lace-contract/wallet-repo' {
  interface BlockchainSpecificInMemoryWalletData {
    Cardano?: CardanoSpecificInMemoryWalletData;
  }
}
