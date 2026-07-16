import type { DRepOption } from '@lace-contract/cardano-context';
import type {
  FeeEntry,
  TxErrorTranslationKeys,
} from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';
import type { StateObject } from '@lace-lib/util-store';

export type VoteDelegationStateIdle = StateObject<'Idle'>;

export type VoteDelegationStateCalculatingFees = StateObject<
  'CalculatingFees',
  {
    accountId: AccountId;
    dRep: DRepOption;
  }
>;

export type VoteDelegationStateError = StateObject<
  'Error',
  {
    accountId: AccountId;
    dRep: DRepOption;
    errorMessage?: string;
    errorTranslationKeys: TxErrorTranslationKeys;
  }
>;

export type VoteDelegationStateSummary = StateObject<
  'Summary',
  {
    accountId: AccountId;
    confirmButtonEnabled: boolean;
    /** Stake key deposit in lovelace as string (empty if already registered) */
    deposit: string;
    dRep: DRepOption;
    fees: FeeEntry[];
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type VoteDelegationStateAwaitingConfirmation = StateObject<
  'AwaitingConfirmation',
  {
    accountId: AccountId;
    confirmButtonEnabled: boolean;
    /** Stake key deposit in lovelace as string (empty if already registered) */
    deposit: string;
    dRep: DRepOption;
    fees: FeeEntry[];
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type VoteDelegationStateProcessing = StateObject<
  'Processing',
  {
    accountId: AccountId;
    /** Stake key deposit in lovelace as string (empty if already registered) */
    deposit: string;
    dRep: DRepOption;
    fees: FeeEntry[];
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type VoteDelegationStateSuccess = StateObject<
  'Success',
  {
    accountId: AccountId;
    /** Stake key deposit in lovelace as string (empty if already registered) */
    deposit: string;
    dRep: DRepOption;
    fees: FeeEntry[];
    txId: string;
  }
>;

export type VoteDelegationFlowState =
  | VoteDelegationStateAwaitingConfirmation
  | VoteDelegationStateCalculatingFees
  | VoteDelegationStateError
  | VoteDelegationStateIdle
  | VoteDelegationStateProcessing
  | VoteDelegationStateSuccess
  | VoteDelegationStateSummary;
