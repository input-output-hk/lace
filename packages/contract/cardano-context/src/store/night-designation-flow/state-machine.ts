import { createStateMachine } from '@lace-lib/util-store';

import type {
  NightDesignationAction,
  NightDesignationBuildResult,
  NightDesignationFlowSliceState,
  NightDesignationStateAwaitingConfirmation,
  NightDesignationStateBuilding,
  NightDesignationStateSummary,
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
        }: {
          accountId: AccountId;
          action: NightDesignationAction;
          dustPubkeyHex?: string;
        },
      ) => ({
        status: 'Building',
        accountId,
        action,
        ...(dustPubkeyHex === undefined ? {} : { dustPubkeyHex }),
      }),
      // A `reset` during an in-flight build returns to Idle; the build
      // side-effect may still emit a late `buildCompleted` afterwards —
      // tolerate it as a no-op rather than an unhandled transition. The
      // payload is accepted (ignored) so the action shape matches Building's.
      buildCompleted: (
        previousState,
        _: { accountId: AccountId; result: NightDesignationBuildResult },
      ) => previousState,
      // Belt-and-braces twin of the late `buildCompleted` above: `reset` no
      // longer wipes AwaitingConfirmation, but a late signing result must never
      // become an unhandled transition. Payload ignored, kept for shape parity.
      confirmationCompleted: (
        previousState,
        _: { result: TxConfirmationResult },
      ) => previousState,
      reset: () => initialState,
    },
    Building: {
      buildCompleted: (
        previousState: NightDesignationStateBuilding,
        {
          accountId,
          result,
        }: { accountId: AccountId; result: NightDesignationBuildResult },
      ) => {
        // The result must answer the request in flight: one built for another
        // account spends that account's UTxOs, never this one's.
        if (accountId !== previousState.accountId) return previousState;
        if (result.success) {
          return {
            status: 'Summary',
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
    Summary: {
      confirmed: (previousState: NightDesignationStateSummary) => ({
        status: 'AwaitingConfirmation',
        accountId: previousState.accountId,
        action: previousState.action,
        ...(previousState.dustPubkeyHex === undefined
          ? {}
          : { dustPubkeyHex: previousState.dustPubkeyHex }),
        fees: previousState.fees,
        serializedTx: previousState.serializedTx,
      }),
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
      // The signing prompt outlives a sheet close, so reset must not wipe the
      // state its result folds into. Answering or cancelling always lands here
      // via confirmationCompleted because tx phases run independently, so no
      // other flow's request can tear this confirm down. Send-flow instead
      // discards at this stage and drops the late result.
      reset: previousState => previousState,
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
      // Same rule one state later: the submit is in flight and must land on
      // Success/Error, so a sheet-close reset must not wipe the state its
      // result folds into (send-flow's Processing.closed no-op is the twin).
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
