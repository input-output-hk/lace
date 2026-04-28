import type { Cardano } from '@cardano-sdk/core';
import type {
  FeeEntry,
  TxErrorTranslationKeys,
} from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';
import type { StateObject } from '@lace-lib/util-store';

export type DelegationStateIdle = StateObject<'Idle'>;

export type DelegationStateCalculatingFees = StateObject<
  'CalculatingFees',
  {
    accountId: AccountId;
    poolId: Cardano.PoolId;
  }
>;

export type DelegationStateError = StateObject<
  'Error',
  {
    accountId: AccountId;
    poolId: Cardano.PoolId;
    errorMessage?: string;
    errorTranslationKeys: TxErrorTranslationKeys;
  }
>;

export type DelegationStateSummary = StateObject<
  'Summary',
  {
    accountId: AccountId;
    confirmButtonEnabled: boolean;
    /** Stake key deposit in lovelace as string (empty if already registered) */
    deposit: string;
    fees: FeeEntry[];
    poolId: Cardano.PoolId;
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type DelegationStateAwaitingConfirmation = StateObject<
  'AwaitingConfirmation',
  {
    accountId: AccountId;
    confirmButtonEnabled: boolean;
    /** Stake key deposit in lovelace as string (empty if already registered) */
    deposit: string;
    fees: FeeEntry[];
    poolId: Cardano.PoolId;
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type DelegationStateProcessing = StateObject<
  'Processing',
  {
    accountId: AccountId;
    /** Stake key deposit in lovelace as string (empty if already registered) */
    deposit: string;
    fees: FeeEntry[];
    poolId: Cardano.PoolId;
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type DelegationStateSuccess = StateObject<
  'Success',
  {
    accountId: AccountId;
    /** Stake key deposit in lovelace as string (empty if already registered) */
    deposit: string;
    fees: FeeEntry[];
    poolId: Cardano.PoolId;
    txId: string;
  }
>;

export type DelegationFlowState =
  | DelegationStateAwaitingConfirmation
  | DelegationStateCalculatingFees
  | DelegationStateError
  | DelegationStateIdle
  | DelegationStateProcessing
  | DelegationStateSuccess
  | DelegationStateSummary;

export type BrowsePoolSortOption =
  | 'blocks'
  | 'cost'
  | 'liveStake'
  | 'margin'
  | 'pledge'
  | 'saturation'
  | 'ticker';
