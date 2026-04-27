import { createStateMachine } from '@lace-lib/util-store';

import type { DelegationFlowState } from './types';
import type { Cardano } from '@cardano-sdk/core';
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
} as DelegationFlowState;

export type DelegationFlowEvent = EventOf<typeof delegationFlowMachine>;

/** Shared so noop handlers use the same second parameter as CalculatingFees (avoids `void & payload` action types). */
type DelegationFeeCalculationCompletedPayload = {
  deposit: string;
  fees: FeeEntry[];
  serializedTx: string;
  wallet: AnyWallet;
};

type DelegationFeeCalculationFailedPayload = {
  errorMessage?: string;
  errorTranslationKeys: TxErrorTranslationKeys;
};

export const delegationFlowMachine = createStateMachine(
  'delegationFlow',
  initialState,
  {
    Idle: {
      feeCalculationRequested: (
        _,
        {
          accountId,
          poolId,
        }: {
          accountId: AccountId;
          poolId: Cardano.PoolId;
        },
      ) => ({
        status: 'CalculatingFees',
        accountId,
        poolId,
      }),
      reset: () => initialState,
    },
    CalculatingFees: {
      feeCalculationCompleted: (
        { accountId, poolId }: { accountId: AccountId; poolId: Cardano.PoolId },
        {
          deposit,
          fees,
          serializedTx,
          wallet,
        }: DelegationFeeCalculationCompletedPayload,
      ) => ({
        accountId,
        confirmButtonEnabled: true,
        deposit,
        fees,
        poolId,
        serializedTx,
        status: 'Summary',
        wallet,
      }),
      feeCalculationFailed: (
        { accountId, poolId },
        {
          errorMessage,
          errorTranslationKeys,
        }: DelegationFeeCalculationFailedPayload,
      ) => ({
        status: 'Error',
        accountId,
        poolId,
        errorMessage,
        errorTranslationKeys,
      }),
      reset: () => initialState,
    },
    Summary: {
      delegationRequested: previousState => ({
        ...previousState,
        confirmButtonEnabled: false,
        status: 'AwaitingConfirmation',
      }),
      // Ignore stale fee-calculation results (e.g. duplicate emissions / races).
      feeCalculationCompleted: (
        previousState,
        _payload: DelegationFeeCalculationCompletedPayload,
      ) => previousState,
      feeCalculationFailed: (
        previousState,
        _payload: DelegationFeeCalculationFailedPayload,
      ) => previousState,
      reset: () => initialState,
    },
    AwaitingConfirmation: {
      confirmationCompleted: (
        { accountId, poolId, deposit, fees, wallet },
        { result }: { result: TxConfirmationResult },
      ) => {
        if (result.success) {
          return {
            accountId,
            deposit,
            fees,
            poolId,
            serializedTx: result.serializedTx,
            status: 'Processing',
            wallet,
          };
        }

        return {
          status: 'Error',
          accountId,
          poolId,
          errorMessage: result.error?.message,
          errorTranslationKeys: result.errorTranslationKeys,
        };
      },
      reset: () => initialState,
    },
    Processing: {
      processingResulted: (
        { accountId, poolId, deposit, fees },
        { result }: { result: TxSubmissionResult },
      ) => {
        if (result.success) {
          return {
            accountId,
            deposit,
            fees,
            poolId,
            status: 'Success',
            txId: result.txId,
          };
        }

        return {
          status: 'Error',
          accountId,
          poolId,
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
        { accountId, poolId }: { accountId: AccountId; poolId: Cardano.PoolId },
      ) => ({
        status: 'CalculatingFees',
        accountId,
        poolId,
      }),
      feeCalculationCompleted: (
        previousState,
        _payload: DelegationFeeCalculationCompletedPayload,
      ) => previousState,
      feeCalculationFailed: (
        previousState,
        _payload: DelegationFeeCalculationFailedPayload,
      ) => previousState,
      reset: () => initialState,
    },
  },
);
