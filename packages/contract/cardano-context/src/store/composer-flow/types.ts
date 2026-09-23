import type { CardanoPaymentAddress } from '../../types';
import type {
  FeeEntry,
  TxErrorTranslationKeys,
} from '@lace-contract/tx-executor';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { ErrorObject, StateObject } from '@lace-lib/util-store';

// =====================================================================
// Cardano transaction composer flow.
// =====================================================================
// Power-user transaction builder: the caller declares WHAT it wants
// (outputs, metadata, a validity window, optionally which UTxOs to
// spend) and the Cardano blockchain module builds, confirms and
// submits it. Mirrors `nightDesignationFlow`'s shape:
//
//   Idle → Building → AwaitingConfirmation → Processing → Success
//                  ↘ Error              ↘ Error          ↘ Error
//
// The request is deliberately CHAIN-DATA-FREE and BigInt-free: no
// UTxO bodies, no protocol parameters, no tip, no slots, no CBOR.
// Everything the build needs beyond the user's intent is resolved by
// the build side-effect from the provider stack, so the renderer never
// fetches chain data itself. Quantities travel as decimal strings
// because slice state must stay JSON-serializable (ADR 08).
//
// The submit emits a generic pending activity with the fees as the
// only known balance change — Cardano's `mapTransactionToActivity`
// classifier reconciles the rest on confirmation.
// =====================================================================

/** A native-token quantity in an output. */
export type ComposerAssetRequest = {
  /** Concatenated policy id + asset name hex, i.e. `Cardano.AssetId`. */
  assetId: string;
  /** Positive integer quantity, as a decimal string. */
  quantity: string;
};

export type ComposerOutputRequest = {
  address: CardanoPaymentAddress;
  /**
   * Lovelace to place on this output, as a decimal string. The build
   * tops it up to the protocol's min-ADA for the output's size when the
   * requested amount is below it, so an assets-only output may pass `'0'`.
   */
  lovelace: string;
  assets?: ComposerAssetRequest[];
};

export type ComposerMetadataEntry = {
  /** Metadata label (CIP-10), as a decimal string — the CDDL key is a uint. */
  label: string;
  /** Metadatum value as JSON text, mapped by the SDK's no-schema conversion. */
  json: string;
};

/** Identifies a UTxO the caller wants forced into the input set. */
export type ComposerInputRef = {
  txId: string;
  index: number;
};

/**
 * The user's composition intent. Everything here is serializable and
 * carries no chain data — see the module header.
 */
export type ComposerRequest = {
  outputs: ComposerOutputRequest[];
  metadata?: ComposerMetadataEntry[];
  /**
   * UTxOs forced into the input set. Absent/empty lets the builder
   * select freely from the account's spendable UTxOs; when set, the
   * builder still tops up from the rest of the pool if the selection
   * doesn't cover the outputs plus fee.
   */
  selectedInputs?: ComposerInputRef[];
  /**
   * Length of the validity window in SECONDS from the chain tip. The
   * build converts it to an absolute `invalidHereafter` slot using the
   * tip slot and the era's slot length — seconds are never used as a
   * slot count. Omitted → the module's default window.
   */
  validitySeconds?: number;
  /**
   * Lower bound (`invalidBefore`) in SECONDS from the chain tip,
   * converted the same way. Omitted → no lower bound.
   */
  validityStartSeconds?: number;
  /** Where change goes. Omitted → the account's primary address. */
  changeAddress?: CardanoPaymentAddress;
};

/**
 * Outcome reported by the build side-effect. On success it carries the
 * unsigned CBOR, the exact fee to display during confirmation, and the
 * transaction id (stable across signing, so the UI can show it before
 * submit); on failure, i18n keys for the build-specific reason.
 */
export type ComposerBuildResult =
  | {
      success: false;
      error?: ErrorObject;
      errorTranslationKeys: TxErrorTranslationKeys;
    }
  | {
      success: true;
      serializedTx: string;
      fees: FeeEntry[];
      txId: string;
    };

export type ComposerFlowStateIdle = StateObject<'Idle'>;

export type ComposerFlowStateBuilding = StateObject<
  'Building',
  {
    accountId: AccountId;
    request: ComposerRequest;
  }
>;

export type ComposerFlowStateAwaitingConfirmation = StateObject<
  'AwaitingConfirmation',
  {
    accountId: AccountId;
    /**
     * The request this CBOR was built from. Kept alongside `serializedTx`
     * so the confirmation surface always describes the transaction it is
     * actually about to sign; a re-composition goes through `Building`
     * again and replaces both together.
     */
    request: ComposerRequest;
    fees: FeeEntry[];
    serializedTx: string;
    txId: string;
  }
>;

export type ComposerFlowStateProcessing = StateObject<
  'Processing',
  {
    accountId: AccountId;
    request: ComposerRequest;
    fees: FeeEntry[];
    serializedTx: string;
    txId: string;
  }
>;

export type ComposerFlowStateSuccess = StateObject<
  'Success',
  {
    accountId: AccountId;
    fees: FeeEntry[];
    txId: string;
  }
>;

export type ComposerFlowStateError = StateObject<
  'Error',
  {
    accountId: AccountId;
    error?: ErrorObject;
    errorTranslationKeys: TxErrorTranslationKeys;
  }
>;

export type ComposerFlowSliceState =
  | ComposerFlowStateAwaitingConfirmation
  | ComposerFlowStateBuilding
  | ComposerFlowStateError
  | ComposerFlowStateIdle
  | ComposerFlowStateProcessing
  | ComposerFlowStateSuccess;
