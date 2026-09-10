import type { EarnRewardsRate } from '../rate';
import type { Cardano } from '@cardano-sdk/core';
import type { SpecificDRepOption } from '@lace-contract/cardano-context';
import type {
  FeeEntry,
  TxErrorTranslationKeys,
} from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';
import type { StateObject } from '@lace-lib/util-store';

/**
 * The one-tap earn-rewards target: the promoted stake pool AND the promoted
 * DRep, resolved for the active network before the flow starts. Both are locked
 * — the flow never lets the user pick alternatives (see the design spec).
 */
export type EarnRewardsTarget = {
  /**
   * Absent when no promoted pool is configured for the network — the user then
   * selects one (LW-15293) — and in `vote-only` mode, where the account
   * already stakes and its pool is left alone.
   */
  poolId?: Cardano.PoolId;
  /**
   * Absent when no promoted DRep is configured for the network. The offer
   * survives on the staking leg alone; an absent DRep must not disable it.
   */
  dRep?: SpecificDRepOption;
  /** Advertised annual reward rate — single value or low–high range — if any. */
  rate?: EarnRewardsRate;
  /**
   * Estimated whole days until the first rewards arrive, derived from the active
   * network's epoch length. Absent when the network's timing is unknown.
   */
  rewardEstimateDays?: number;
};

export type EarnRewardsStateIdle = StateObject<'Idle'>;

export type EarnRewardsStateCalculatingFees = StateObject<
  'CalculatingFees',
  {
    accountId: AccountId;
    /** Absent in `vote-only` mode — the account already stakes and its pool is left alone. */
    poolId?: Cardano.PoolId;
    /** Absent when no promoted DRep is configured — the tx stakes without voting. */
    dRep?: SpecificDRepOption;
  }
>;

/** Which stage of the one-tap flow failed — the single dimension that makes the
 * `delegation | failure` funnel event diagnosable (fee estimate vs sign vs
 * submit), since each maps to a distinct Error transition. */
export type EarnRewardsFailurePhase =
  | 'fee-calculation'
  | 'signing'
  | 'submission';

export type EarnRewardsStateError = StateObject<
  'Error',
  {
    accountId: AccountId;
    /** Absent in `vote-only` mode — the account already stakes and its pool is left alone. */
    poolId?: Cardano.PoolId;
    dRep?: SpecificDRepOption;
    phase: EarnRewardsFailurePhase;
    errorMessage?: string;
    errorTranslationKeys: TxErrorTranslationKeys;
  }
>;

export type EarnRewardsStateSummary = StateObject<
  'Summary',
  {
    accountId: AccountId;
    /** Stake key deposit in lovelace as string (empty if already registered) */
    deposit: string;
    fees: FeeEntry[];
    /** Absent in `vote-only` mode — the account already stakes and its pool is left alone. */
    poolId?: Cardano.PoolId;
    dRep?: SpecificDRepOption;
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type EarnRewardsStateAwaitingConfirmation = StateObject<
  'AwaitingConfirmation',
  {
    accountId: AccountId;
    /** Stake key deposit in lovelace as string (empty if already registered) */
    deposit: string;
    fees: FeeEntry[];
    /** Absent in `vote-only` mode — the account already stakes and its pool is left alone. */
    poolId?: Cardano.PoolId;
    dRep?: SpecificDRepOption;
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type EarnRewardsStateProcessing = StateObject<
  'Processing',
  {
    accountId: AccountId;
    /** Stake key deposit in lovelace as string (empty if already registered) */
    deposit: string;
    fees: FeeEntry[];
    /** Absent in `vote-only` mode — the account already stakes and its pool is left alone. */
    poolId?: Cardano.PoolId;
    dRep?: SpecificDRepOption;
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type EarnRewardsStateSuccess = StateObject<
  'Success',
  {
    accountId: AccountId;
    /** Stake key deposit in lovelace as string (empty if already registered) */
    deposit: string;
    fees: FeeEntry[];
    /** Absent in `vote-only` mode — the account already stakes and its pool is left alone. */
    poolId?: Cardano.PoolId;
    dRep?: SpecificDRepOption;
    txId: string;
  }
>;

export type EarnRewardsFlowState =
  | EarnRewardsStateAwaitingConfirmation
  | EarnRewardsStateCalculatingFees
  | EarnRewardsStateError
  | EarnRewardsStateIdle
  | EarnRewardsStateProcessing
  | EarnRewardsStateSuccess
  | EarnRewardsStateSummary;
