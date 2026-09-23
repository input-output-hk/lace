import { createStateMachine } from '@lace-lib/util-store';

import type {
  ComposerBuildResult,
  ComposerFlowSliceState,
  ComposerFlowStateAwaitingConfirmation,
  ComposerFlowStateBuilding,
  ComposerRequest,
} from './types';
import type {
  TxConfirmationResult,
  TxSubmissionResult,
} from '@lace-contract/tx-executor';
import type { AccountId } from '@lace-contract/wallet-repo';

const initialState = {
  status: 'Idle',
} as ComposerFlowSliceState;

export const composerFlowMachine = createStateMachine(
  'composerFlow',
  initialState,
  {
    Idle: {
      composeRequested: (
        _,
        {
          accountId,
          request,
        }: {
          accountId: AccountId;
          request: ComposerRequest;
        },
      ) => ({
        status: 'Building',
        accountId,
        request,
      }),
      // A `reset` during an in-flight build returns to Idle; the build
      // side-effect may still emit a late `buildCompleted` afterwards —
      // tolerate it as a no-op rather than an unhandled transition. The
      // payload is accepted (ignored) so the action shape matches Building's.
      buildCompleted: (
        previousState,
        _: { accountId: AccountId; result: ComposerBuildResult },
      ) => previousState,
      // The host can only answer a ceremony this flow started, so a
      // confirmation reaching Idle means the composition was abandoned
      // (`reset`) while the user was approving it. The signed transaction is
      // deliberately dropped rather than submitted: nothing on screen still
      // describes it, and resurrecting the flow would spend from an account
      // whose surface is gone.
      confirmationCompleted: (
        previousState,
        _: { result: TxConfirmationResult },
      ) => previousState,
      reset: () => initialState,
    },
    Building: {
      buildCompleted: (
        previousState: ComposerFlowStateBuilding,
        {
          accountId,
          result,
        }: { accountId: AccountId; result: ComposerBuildResult },
      ) => {
        // The result must answer the request in flight: one built for another
        // account must never become the transaction this surface then signs.
        if (accountId !== previousState.accountId) return previousState;
        if (result.success) {
          return {
            status: 'AwaitingConfirmation',
            accountId: previousState.accountId,
            request: previousState.request,
            fees: result.fees,
            serializedTx: result.serializedTx,
            txId: result.txId,
          };
        }
        return {
          status: 'Error',
          accountId: previousState.accountId,
          error: result.error,
          errorTranslationKeys: result.errorTranslationKeys,
        };
      },
      reset: () => initialState,
    },
    AwaitingConfirmation: {
      confirmationCompleted: (
        previousState: ComposerFlowStateAwaitingConfirmation,
        { result }: { result: TxConfirmationResult },
      ) => {
        if (result.success) {
          return {
            status: 'Processing',
            accountId: previousState.accountId,
            request: previousState.request,
            fees: previousState.fees,
            // Signing adds witnesses without touching the body, so the
            // id computed at build time still identifies this tx.
            serializedTx: result.serializedTx,
            txId: previousState.txId,
          };
        }
        return {
          status: 'Error',
          accountId: previousState.accountId,
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
            fees: previousState.fees,
            txId: result.txId,
          };
        }
        return {
          status: 'Error',
          accountId: previousState.accountId,
          error: result.error,
          errorTranslationKeys: result.errorTranslationKeys,
        };
      },
      // A submitted transaction cannot be recalled, so a `reset` while it
      // is in flight must not drop the state the submit result lands on.
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
