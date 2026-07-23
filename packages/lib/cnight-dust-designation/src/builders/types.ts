import type { CardanoPaymentKeyHash } from '../value-objects/cardano-payment-key-hash.vo';
import type { CardanoStakeKeyHash } from '../value-objects/cardano-stake-key-hash.vo';
import type { MidnightCoinPubkey } from '../value-objects/midnight-coin-pubkey.vo';
import type { CardanoDustNetwork } from '../value-objects/network-id.vo';
import type { Cardano } from '@cardano-sdk/core';
import type { HexBlob } from '@cardano-sdk/util';

// =====================================================================
// Builder input + output shapes.
// =====================================================================
// The lib's Phase 1 deliverable surfaces the *deterministic* parts of
// the tx (datum, redeemer, script-address, nft asset id, required
// signers). Phase 2 (the workspace hoist) fills in coin-selection,
// fee-calculation, ex-units evaluation, collateral selection, and
// balancing — that's why the Phase 1 builders return a structured
// "blueprint" rather than a signed CBOR.
//
// The blueprint shape is designed so the Phase 2 implementation can
// consume it without re-deriving anything — the caller's stake-key /
// payment-key / network choices propagate verbatim into the tx body.
// =====================================================================

/** What the user is trying to do. */
export type NightDesignationAction =
  | {
      kind: 'deregister';
      /** The UTxO at the script address that holds the existing registration. */
      registrationUtxo: Cardano.Utxo;
    }
  | {
      kind: 'update';
      dustPubkey: MidnightCoinPubkey;
      /** The UTxO at the script address that holds the existing registration. */
      registrationUtxo: Cardano.Utxo;
      /** Withdrawable amount on the script's reward account, queried by the caller. */
      scriptWithdrawableLovelace: bigint;
    }
  | { kind: 'register'; dustPubkey: MidnightCoinPubkey };

export type BuildNightDesignationTxParams = {
  network: CardanoDustNetwork;
  /** All cNIGHT UTxOs in the wallet — every one is forced as input for rotation. */
  cnightUtxos: Cardano.Utxo[];
  /** Stake credential of the user's Cardano account; embedded in the datum + signers. */
  stakeKeyHash: CardanoStakeKeyHash;
  /** Payment credential of the user's Cardano account; embedded as required signer. */
  paymentKeyHash: CardanoPaymentKeyHash;
  /** What the user is doing — register, update, deregister. */
  action: NightDesignationAction;
  /**
   * Protocol's `coins_per_utxo_byte` parameter. Used to compute the
   * min-utxo floor on the script output (script address + 1
   * mapping NFT + inline DustMappingDatum). Pass `protocolParameters.
   * coinsPerUtxoByte` from `completeNightDesignationTx`.
   */
  coinsPerUtxoByte: number;
};

/**
 * The deterministic primitives the tx needs. Phase 2 composes these
 * into a balanced `Serialization.Transaction`, evaluates ex-units, and
 * signs through the existing wallet pipeline.
 */
export type NightDesignationTxBlueprint = {
  network: CardanoDustNetwork;
  scriptAddress: Cardano.PaymentAddress;
  scriptRewardAccount: Cardano.RewardAccount;
  dustMappingNftAssetId: Cardano.AssetId;
  /**
   * Inputs the tx MUST consume (cNIGHT rotation + the existing
   * registration UTxO for update / deregister). Phase 2 supplements
   * with coin-selection over the wallet's other UTxOs.
   */
  forcedInputs: Cardano.Utxo[];
  /** Outputs to materialise — script address + change is left to Phase 2. */
  scriptOutput: {
    address: Cardano.PaymentAddress;
    lovelace: bigint;
    nftAsset: Cardano.AssetId;
    nftQuantity: bigint;
    inlineDatumCbor: HexBlob;
  } | null;
  /** Mint entry to add to the tx body. */
  mint: {
    policyId: Cardano.PolicyId;
    assetName: Cardano.AssetName;
    quantity: bigint;
    redeemerCbor: HexBlob;
  } | null;
  /** Spend redeemer to attach to the registration-UTxO input (update / deregister). */
  spendRedeemer: {
    registrationUtxo: Cardano.Utxo;
    redeemerCbor: HexBlob;
  } | null;
  /** Withdrawal entry for the update flow. */
  withdrawal: {
    rewardAccount: Cardano.RewardAccount;
    lovelace: bigint;
    redeemerCbor: HexBlob;
  } | null;
  /** extra_signatories: payment + stake key hashes for the account. */
  requiredSigners: {
    paymentKeyHash: CardanoPaymentKeyHash;
    stakeKeyHash: CardanoStakeKeyHash;
  };
  /** Script CBOR to attach to the witness set as a Plutus V3 script. */
  scriptCbor: HexBlob;
};
