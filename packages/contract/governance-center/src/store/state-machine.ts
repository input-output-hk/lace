import { createStateMachine } from '@lace-lib/util-store';

import type { VoteDelegationFlowState } from './types';
import type { DRepOption } from '@lace-contract/cardano-context';
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
} as VoteDelegationFlowState;

export type VoteDelegationFlowEvent = EventOf<typeof voteDelegationFlowMachine>;

type VoteDelegationFeeCalculationCompletedPayload = {
  deposit: string;
  fees: FeeEntry[];
  serializedTx: string;
  wallet: AnyWallet;
};

type VoteDelegationFeeCalculationFailedPayload = {
  errorMessage?: string;
  errorTranslationKeys: TxErrorTranslationKeys;
};

export const voteDelegationFlowMachine = createStateMachine(
  'voteDelegationFlow',
  initialState,
  {
    Idle: {
      feeCalculationRequested: (
        _,
        {
          accountId,
          dRep,
        }: {
          accountId: AccountId;
          dRep: DRepOption;
        },
      ) => ({
        status: 'CalculatingFees',
        accountId,
        dRep,
      }),
      reset: () => initialState,
    },
    CalculatingFees: {
      feeCalculationCompleted: (
        { accountId, dRep }: { accountId: AccountId; dRep: DRepOption },
        {
          deposit,
          fees,
          serializedTx,
          wallet,
        }: VoteDelegationFeeCalculationCompletedPayload,
      ) => ({
        accountId,
        confirmButtonEnabled: true,
        deposit,
        dRep,
        fees,
        serializedTx,
        status: 'Summary',
        wallet,
      }),
      feeCalculationFailed: (
        { accountId, dRep },
        {
          errorMessage,
          errorTranslationKeys,
        }: VoteDelegationFeeCalculationFailedPayload,
      ) => ({
        status: 'Error',
        accountId,
        dRep,
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
      feeCalculationCompleted: (
        previousState,
        _payload: VoteDelegationFeeCalculationCompletedPayload,
      ) => previousState,
      feeCalculationFailed: (
        previousState,
        _payload: VoteDelegationFeeCalculationFailedPayload,
      ) => previousState,
      reset: () => initialState,
    },
    AwaitingConfirmation: {
      confirmationCompleted: (
        { accountId, dRep, deposit, fees, wallet },
        { result }: { result: TxConfirmationResult },
      ) => {
        if (result.success) {
          return {
            accountId,
            deposit,
            dRep,
            fees,
            serializedTx: result.serializedTx,
            status: 'Processing',
            wallet,
          };
        }

        return {
          status: 'Error',
          accountId,
          dRep,
          errorMessage: result.error?.message,
          errorTranslationKeys: result.errorTranslationKeys,
        };
      },
      reset: () => initialState,
    },
    Processing: {
      processingResulted: (
        { accountId, dRep, deposit, fees },
        { result }: { result: TxSubmissionResult },
      ) => {
        if (result.success) {
          return {
            accountId,
            deposit,
            dRep,
            fees,
            status: 'Success',
            txId: result.txId,
          };
        }

        return {
          status: 'Error',
          accountId,
          dRep,
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
        { accountId, dRep }: { accountId: AccountId; dRep: DRepOption },
      ) => ({
        status: 'CalculatingFees',
        accountId,
        dRep,
      }),
      feeCalculationCompleted: (
        previousState,
        _payload: VoteDelegationFeeCalculationCompletedPayload,
      ) => previousState,
      feeCalculationFailed: (
        previousState,
        _payload: VoteDelegationFeeCalculationFailedPayload,
      ) => previousState,
      reset: () => initialState,
    },
  },
);
