import type {
  FeeEntry,
  TxErrorTranslationKeys,
} from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';
import type { StateObject } from '@lace-lib/util-store';

export type DeregistrationStateIdle = StateObject<'Idle'>;

export type DeregistrationStateCalculatingFees = StateObject<
  'CalculatingFees',
  {
    accountId: AccountId;
  }
>;

export type DeregistrationStateError = StateObject<
  'Error',
  {
    accountId: AccountId;
    errorMessage?: string;
    errorTranslationKeys: TxErrorTranslationKeys;
  }
>;

export type DeregistrationStateSummary = StateObject<
  'Summary',
  {
    accountId: AccountId;
    confirmButtonEnabled: boolean;
    /** Deposit return in lovelace as string (positive value - user gets this back) */
    depositReturn: string;
    fees: FeeEntry[];
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type DeregistrationStateAwaitingConfirmation = StateObject<
  'AwaitingConfirmation',
  {
    accountId: AccountId;
    confirmButtonEnabled: boolean;
    /** Deposit return in lovelace as string (positive value - user gets this back) */
    depositReturn: string;
    fees: FeeEntry[];
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type DeregistrationStateProcessing = StateObject<
  'Processing',
  {
    accountId: AccountId;
    /** Deposit return in lovelace as string (positive value - user gets this back) */
    depositReturn: string;
    fees: FeeEntry[];
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type DeregistrationStateSuccess = StateObject<
  'Success',
  {
    accountId: AccountId;
    /** Deposit return in lovelace as string (positive value - user gets this back) */
    depositReturn: string;
    fees: FeeEntry[];
    txId: string;
  }
>;

export type DeregistrationFlowState =
  | DeregistrationStateAwaitingConfirmation
  | DeregistrationStateCalculatingFees
  | DeregistrationStateError
  | DeregistrationStateIdle
  | DeregistrationStateProcessing
  | DeregistrationStateSuccess
  | DeregistrationStateSummary;
