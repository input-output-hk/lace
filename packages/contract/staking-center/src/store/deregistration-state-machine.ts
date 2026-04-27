import { createStateMachine } from '@lace-lib/util-store';

import type { DeregistrationFlowState } from './deregistration-types';
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
} as DeregistrationFlowState;

export type DeregistrationFlowEvent = EventOf<typeof deregistrationFlowMachine>;

export const deregistrationFlowMachine = createStateMachine(
  'deregistrationFlow',
  initialState,
  {
    Idle: {
      feeCalculationRequested: (
        _,
        {
          accountId,
        }: {
          accountId: AccountId;
        },
      ) => ({
        status: 'CalculatingFees',
        accountId,
      }),
      reset: () => initialState,
    },
    CalculatingFees: {
      feeCalculationCompleted: (
        { accountId }: { accountId: AccountId },
        {
          depositReturn,
          fees,
          serializedTx,
          wallet,
        }: {
          depositReturn: string;
          fees: FeeEntry[];
          serializedTx: string;
          wallet: AnyWallet;
        },
      ) => ({
        accountId,
        confirmButtonEnabled: true,
        depositReturn,
        fees,
        serializedTx,
        status: 'Summary',
        wallet,
      }),
      feeCalculationFailed: (
        { accountId },
        {
          errorMessage,
          errorTranslationKeys,
        }: {
          errorMessage?: string;
          errorTranslationKeys: TxErrorTranslationKeys;
        },
      ) => ({
        status: 'Error',
        accountId,
        errorMessage,
        errorTranslationKeys,
      }),
      reset: () => initialState,
    },
    Summary: {
      deregistrationRequested: previousState => ({
        ...previousState,
        confirmButtonEnabled: false,
        status: 'AwaitingConfirmation',
      }),
      reset: () => initialState,
    },
    AwaitingConfirmation: {
      confirmationCompleted: (
        { accountId, depositReturn, fees, wallet },
        { result }: { result: TxConfirmationResult },
      ) => {
        if (result.success) {
          return {
            accountId,
            depositReturn,
            fees,
            serializedTx: result.serializedTx,
            status: 'Processing',
            wallet,
          };
        }

        return {
          status: 'Error',
          accountId,
          errorMessage: result.error?.message,
          errorTranslationKeys: result.errorTranslationKeys,
        };
      },
      reset: () => initialState,
    },
    Processing: {
      processingResulted: (
        { accountId, depositReturn, fees },
        { result }: { result: TxSubmissionResult },
      ) => {
        if (result.success) {
          return {
            accountId,
            depositReturn,
            fees,
            status: 'Success',
            txId: result.txId,
          };
        }

        return {
          status: 'Error',
          accountId,
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
        { accountId }: { accountId: AccountId },
      ) => ({
        status: 'CalculatingFees',
        accountId,
      }),
      reset: () => initialState,
    },
  },
);
