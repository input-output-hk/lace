import { createStateMachine } from '@lace-lib/util-store';

import type { EarnRewardsFlowState, EarnRewardsTarget } from './types';
import type {
  FeeEntry,
  TxConfirmationResult,
  TxErrorTranslationKeys,
  TxSubmissionResult,
} from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';
import type { EventOf } from '@lace-lib/util-store';

const initialState = {
  status: 'Idle',
} as EarnRewardsFlowState;

export type EarnRewardsFlowEvent = EventOf<typeof earnRewardsFlowMachine>;

/** The flow always starts from a resolved target plus the account acting. */
type EarnRewardsRequestPayload = EarnRewardsTarget & { accountId: AccountId };

/** Shared so noop handlers use the same second parameter as CalculatingFees (avoids `void & payload` action types). */
type EarnRewardsFeeCalculationCompletedPayload = {
  deposit: string;
  fees: FeeEntry[];
  serializedTx: string;
  wallet: AnyWallet;
};

type EarnRewardsFeeCalculationFailedPayload = {
  errorMessage?: string;
  errorTranslationKeys: TxErrorTranslationKeys;
};

export const earnRewardsFlowMachine = createStateMachine(
  'earnRewardsFlow',
  initialState,
  {
    Idle: {
      feeCalculationRequested: (
        _,
        { accountId, poolId, dRep }: EarnRewardsRequestPayload,
      ) => ({
        status: 'CalculatingFees',
        accountId,
        poolId,
        dRep,
      }),
      reset: () => initialState,
    },
    CalculatingFees: {
      feeCalculationCompleted: (
        { accountId, poolId, dRep },
        {
          deposit,
          fees,
          serializedTx,
          wallet,
        }: EarnRewardsFeeCalculationCompletedPayload,
      ) => ({
        accountId,
        deposit,
        fees,
        poolId,
        dRep,
        serializedTx,
        status: 'Summary',
        wallet,
      }),
      feeCalculationFailed: (
        { accountId, poolId, dRep },
        {
          errorMessage,
          errorTranslationKeys,
        }: EarnRewardsFeeCalculationFailedPayload,
      ) => ({
        status: 'Error',
        accountId,
        poolId,
        dRep,
        phase: 'fee-calculation',
        errorMessage,
        errorTranslationKeys,
      }),
      reset: () => initialState,
    },
    Summary: {
      earnRewardsRequested: previousState => ({
        ...previousState,
        status: 'AwaitingConfirmation',
      }),
      // Ignore stale fee-calculation results (e.g. duplicate emissions / races).
      feeCalculationCompleted: (
        previousState,
        _payload: EarnRewardsFeeCalculationCompletedPayload,
      ) => previousState,
      feeCalculationFailed: (
        previousState,
        _payload: EarnRewardsFeeCalculationFailedPayload,
      ) => previousState,
      reset: () => initialState,
    },
    AwaitingConfirmation: {
      confirmationCompleted: (
        { accountId, poolId, dRep, deposit, fees, wallet },
        { result }: { result: TxConfirmationResult },
      ) => {
        if (result.success) {
          return {
            accountId,
            deposit,
            fees,
            poolId,
            dRep,
            serializedTx: result.serializedTx,
            status: 'Processing',
            wallet,
          };
        }

        return {
          status: 'Error',
          accountId,
          poolId,
          dRep,
          phase: 'signing',
          errorMessage: result.error?.message,
          errorTranslationKeys: result.errorTranslationKeys,
        };
      },
      reset: () => initialState,
    },
    Processing: {
      processingResulted: (
        { accountId, poolId, dRep, deposit, fees },
        { result }: { result: TxSubmissionResult },
      ) => {
        if (result.success) {
          return {
            accountId,
            deposit,
            fees,
            poolId,
            dRep,
            status: 'Success',
            txId: result.txId,
          };
        }

        return {
          status: 'Error',
          accountId,
          poolId,
          dRep,
          phase: 'submission',
          errorMessage: result.error?.message,
          errorTranslationKeys: result.errorTranslationKeys,
        };
      },
      reset: previousState => previousState,
    },
    Success: {
      reset: () => initialState,
    },
    Error: {
      retryRequested: (
        _previousState,
        { accountId, poolId, dRep }: EarnRewardsRequestPayload,
      ) => ({
        status: 'CalculatingFees',
        accountId,
        poolId,
        dRep,
      }),
      feeCalculationCompleted: (
        previousState,
        _payload: EarnRewardsFeeCalculationCompletedPayload,
      ) => previousState,
      feeCalculationFailed: (
        previousState,
        _payload: EarnRewardsFeeCalculationFailedPayload,
      ) => previousState,
      reset: () => initialState,
    },
  },
);
