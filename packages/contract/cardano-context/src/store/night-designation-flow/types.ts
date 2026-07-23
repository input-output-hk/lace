import type {
  FeeEntry,
  TxErrorTranslationKeys,
} from '@lace-contract/tx-executor';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { ErrorObject, StateObject } from '@lace-lib/util-store';

// =====================================================================
// cNIGHT-on-Cardano DUST designation flow.
// =====================================================================
// Purpose-built orchestrator for the Plutus V3 cNIGHT validator txs
// (designate / update / deregister). The build runs inline: the
// Cardano blockchain module's build side-effect maps the action to
// the local `TransactionBuilder` and reports the unsigned CBOR.
//
// State machine:
//   Idle → Building → AwaitingConfirmation → Processing → Success
//                  ↘ Error              ↘ Error          ↘ Error
//
// `designationRequested` carries only serializable build inputs (the
// action discriminant + dust pubkey hex + optional script-withdrawable
// amount); the build side-effect resolves the rest from account state +
// the provider, runs the tx-builder, and reports via `buildCompleted`.
// The slice owns build + confirm + submit via tx-executor.
// =====================================================================

export type NightDesignationAction = 'deregister' | 'designate' | 'update';

/**
 * Outcome reported by the build side-effect. On success it carries the
 * unsigned CBOR + the fee breakdown to display during confirmation; on
 * failure it carries i18n keys (build-specific — e.g. no cNIGHT, no
 * eligible collateral).
 */
export type NightDesignationBuildResult =
  | {
      success: false;
      error?: ErrorObject;
      errorTranslationKeys: TxErrorTranslationKeys;
    }
  | {
      success: true;
      serializedTx: string;
      fees: FeeEntry[];
    };

export type NightDesignationStateIdle = StateObject<'Idle'>;

export type NightDesignationStateBuilding = StateObject<
  'Building',
  {
    accountId: AccountId;
    action: NightDesignationAction;
    dustPubkeyHex?: string;
    /**
     * Lovelace withdrawable from the script reward account, as a decimal
     * string (serializable — no BigInt in state). Set for `update` (the
     * only action that withdraws); the build side-effect reads it to size
     * the script withdrawal.
     */
    scriptWithdrawableLovelace?: string;
  }
>;

export type NightDesignationStateAwaitingConfirmation = StateObject<
  'AwaitingConfirmation',
  {
    accountId: AccountId;
    action: NightDesignationAction;
    /**
     * 32-byte hex of the Midnight coin pubkey written into the new
     * DustMappingDatum. Set for `designate` and `update`; absent for
     * `deregister` (no new datum — existing one is burned). Carried
     * through to the pending activity metadata so the UI can show
     * the designation target while the tx is in flight.
     */
    dustPubkeyHex?: string;
    fees: FeeEntry[];
    serializedTx: string;
  }
>;

export type NightDesignationStateProcessing = StateObject<
  'Processing',
  {
    accountId: AccountId;
    action: NightDesignationAction;
    dustPubkeyHex?: string;
    fees: FeeEntry[];
    serializedTx: string;
  }
>;

export type NightDesignationStateSuccess = StateObject<
  'Success',
  {
    accountId: AccountId;
    action: NightDesignationAction;
    dustPubkeyHex?: string;
    fees: FeeEntry[];
    txId: string;
  }
>;

export type NightDesignationStateError = StateObject<
  'Error',
  {
    accountId: AccountId;
    action: NightDesignationAction;
    dustPubkeyHex?: string;
    error?: ErrorObject;
    errorTranslationKeys: TxErrorTranslationKeys;
  }
>;

export type NightDesignationFlowSliceState =
  | NightDesignationStateAwaitingConfirmation
  | NightDesignationStateBuilding
  | NightDesignationStateError
  | NightDesignationStateIdle
  | NightDesignationStateProcessing
  | NightDesignationStateSuccess;
