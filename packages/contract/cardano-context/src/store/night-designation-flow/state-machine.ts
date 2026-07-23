import { createStateMachine } from '@lace-lib/util-store';

import type {
  NightDesignationAction,
  NightDesignationBuildResult,
  NightDesignationFlowSliceState,
  NightDesignationStateAwaitingConfirmation,
  NightDesignationStateBuilding,
} from './types';
import type {
  TxConfirmationResult,
  TxSubmissionResult,
} from '@lace-contract/tx-executor';
import type { AccountId } from '@lace-contract/wallet-repo';

const initialState = {
  status: 'Idle',
} as NightDesignationFlowSliceState;

export const nightDesignationFlowMachine = createStateMachine(
  'nightDesignationFlow',
  initialState,
  {
    Idle: {
      designationRequested: (
        _,
        {
          accountId,
          action,
          dustPubkeyHex,
          scriptWithdrawableLovelace,
        }: {
          accountId: AccountId;
          action: NightDesignationAction;
          dustPubkeyHex?: string;
          // update-only; a decimal string (serializable) read by the build
          // side-effect to size the script reward withdrawal.
          scriptWithdrawableLovelace?: string;
        },
      ) => ({
        status: 'Building',
        accountId,
        action,
        ...(dustPubkeyHex === undefined ? {} : { dustPubkeyHex }),
        ...(scriptWithdrawableLovelace === undefined
          ? {}
          : { scriptWithdrawableLovelace }),
      }),
      // A `reset` during an in-flight build returns to Idle; the build
      // side-effect may still emit a late `buildCompleted` afterwards —
      // tolerate it as a no-op rather than an unhandled transition. The
      // payload is accepted (ignored) so the action shape matches Building's.
      buildCompleted: (
        previousState,
        _: { result: NightDesignationBuildResult },
      ) => previousState,
      reset: () => initialState,
    },
    Building: {
      buildCompleted: (
        previousState: NightDesignationStateBuilding,
        { result }: { result: NightDesignationBuildResult },
      ) => {
        if (result.success) {
          return {
            status: 'AwaitingConfirmation',
            accountId: previousState.accountId,
            action: previousState.action,
            ...(previousState.dustPubkeyHex === undefined
              ? {}
              : { dustPubkeyHex: previousState.dustPubkeyHex }),
            fees: result.fees,
            serializedTx: result.serializedTx,
          };
        }
        return {
          status: 'Error',
          accountId: previousState.accountId,
          action: previousState.action,
          ...(previousState.dustPubkeyHex === undefined
            ? {}
            : { dustPubkeyHex: previousState.dustPubkeyHex }),
          error: result.error,
          errorTranslationKeys: result.errorTranslationKeys,
        };
      },
      reset: () => initialState,
    },
    AwaitingConfirmation: {
      confirmationCompleted: (
        previousState: NightDesignationStateAwaitingConfirmation,
        { result }: { result: TxConfirmationResult },
      ) => {
        if (result.success) {
          return {
            status: 'Processing',
            accountId: previousState.accountId,
            action: previousState.action,
            ...(previousState.dustPubkeyHex === undefined
              ? {}
              : { dustPubkeyHex: previousState.dustPubkeyHex }),
            fees: previousState.fees,
            serializedTx: result.serializedTx,
          };
        }
        return {
          status: 'Error',
          accountId: previousState.accountId,
          action: previousState.action,
          ...(previousState.dustPubkeyHex === undefined
            ? {}
            : { dustPubkeyHex: previousState.dustPubkeyHex }),
          error: result.error,
          errorTranslationKeys: result.errorTranslationKeys,
        };
      },
      reset: () => initialState,
    },
    Processing: {
      processingResulted: (
        previousState,
        { result }: { result: TxSubmissionResult },
      ) => {
        if (result.success) {
          return {
            status: 'Success',
            accountId: previousState.accountId,
            action: previousState.action,
            ...(previousState.dustPubkeyHex === undefined
              ? {}
              : { dustPubkeyHex: previousState.dustPubkeyHex }),
            fees: previousState.fees,
            txId: result.txId,
          };
        }
        return {
          status: 'Error',
          accountId: previousState.accountId,
          action: previousState.action,
          ...(previousState.dustPubkeyHex === undefined
            ? {}
            : { dustPubkeyHex: previousState.dustPubkeyHex }),
          error: result.error,
          errorTranslationKeys: result.errorTranslationKeys,
        };
      },
      reset: previousState => previousState,
    },
    Success: {
      reset: () => initialState,
    },
    Error: {
      reset: () => initialState,
    },
  },
);
