import { createStateMachine } from '@lace-lib/util-store';

import type { RealFiFlowKind, RealFiFlowState, RealFiReview } from './types';
import type { RealFiErrorCode } from '../provider-types';
import type { RealFiStakeId } from '../value-objects';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { EventOf } from '@lace-lib/util-store';

const initialState = { status: 'Idle' } as RealFiFlowState;

type PrepareRequestedPayload = {
  kind: RealFiFlowKind;
  accountId: AccountId;
  inputAmount: string;
  inputTokenId: string;
  /** Desired output token id (unstake only); USDr ⇒ no swap. */
  outputTokenId: string;
};

type ReviewReceivedPayload = { review: RealFiReview };
type ReviewFailedPayload = {
  errorMessage: TranslationKey;
  errorDetail?: string;
  errorCode?: RealFiErrorCode;
};
type BuildCompletedPayload = { unsignedTxCbor: string };
type SubmissionStartedPayload = {
  serializedTx: string;
  orderOutputIndex?: number;
};
type QueuedPayload = { txId: string; stakeId: RealFiStakeId };
type SubmissionFailedPayload = {
  errorMessage: TranslationKey;
  errorDetail?: string;
  errorCode?: RealFiErrorCode;
};

export const realfiFlowMachine = createStateMachine(
  'realfiFlow',
  initialState,
  {
    Idle: {
      prepareRequested: (
        _,
        {
          kind,
          accountId,
          inputAmount,
          inputTokenId,
          outputTokenId,
        }: PrepareRequestedPayload,
      ) => ({
        status: 'Preparing',
        kind,
        accountId,
        inputAmount,
        inputTokenId,
        outputTokenId,
      }),
      reset: () => initialState,
    },
    Preparing: {
      reviewReceived: (
        { kind, accountId, inputAmount, inputTokenId, outputTokenId },
        { review }: ReviewReceivedPayload,
      ) => ({
        status: 'ReviewingTransaction',
        kind,
        accountId,
        inputAmount,
        inputTokenId,
        outputTokenId,
        review,
      }),
      reviewFailed: (
        { kind, accountId, inputAmount, inputTokenId, outputTokenId },
        { errorMessage, errorDetail, errorCode }: ReviewFailedPayload,
      ) => ({
        status: 'Error',
        kind,
        accountId,
        inputAmount,
        inputTokenId,
        outputTokenId,
        errorMessage,
        errorDetail,
        errorCode,
        previousStatus: 'Preparing',
      }),
      reset: () => initialState,
    },
    ReviewingTransaction: {
      signingRequested: ({
        kind,
        accountId,
        inputAmount,
        inputTokenId,
        outputTokenId,
        review,
      }) => ({
        status: 'SigningTransaction',
        kind,
        accountId,
        inputAmount,
        inputTokenId,
        outputTokenId,
        review,
        unsignedTxCbor: '',
      }),
      reset: () => initialState,
    },
    SigningTransaction: {
      buildCompleted: (
        previousState,
        { unsignedTxCbor }: BuildCompletedPayload,
      ) => ({ ...previousState, unsignedTxCbor }),
      // A declined/failed signing prompt returns to Reviewing (not Error): the
      // user's own act, matching the claim flow's quiet `withdrawDeclined`.
      // The review is intact, so the sheet re-enables Confirm rather than
      // showing "Transaction failed" (R3-3 — restores the route P3-d removed).
      signingCancelled: ({
        kind,
        accountId,
        inputAmount,
        inputTokenId,
        outputTokenId,
        review,
      }) => ({
        status: 'ReviewingTransaction',
        kind,
        accountId,
        inputAmount,
        inputTokenId,
        outputTokenId,
        review,
      }),
      submissionStarted: (
        { kind, accountId, inputAmount, inputTokenId, outputTokenId, review },
        { serializedTx, orderOutputIndex }: SubmissionStartedPayload,
      ) => ({
        status: 'SubmittingTransaction',
        kind,
        accountId,
        inputAmount,
        inputTokenId,
        outputTokenId,
        review,
        serializedTx,
        orderOutputIndex,
      }),
      submissionFailed: (
        { kind, accountId, inputAmount, inputTokenId, outputTokenId },
        { errorMessage, errorDetail, errorCode }: SubmissionFailedPayload,
      ) => ({
        status: 'Error',
        kind,
        accountId,
        inputAmount,
        inputTokenId,
        outputTokenId,
        errorMessage,
        errorDetail,
        errorCode,
        previousStatus: 'SigningTransaction',
      }),
      reset: () => initialState,
    },
    SubmittingTransaction: {
      queued: (
        { kind, accountId, inputTokenId },
        { txId, stakeId }: QueuedPayload,
      ) => ({
        status: 'Queued',
        kind,
        accountId,
        txId,
        stakeId,
        inputTokenId,
      }),
      submissionFailed: (
        { kind, accountId, inputAmount, inputTokenId, outputTokenId },
        { errorMessage, errorDetail, errorCode }: SubmissionFailedPayload,
      ) => ({
        status: 'Error',
        kind,
        accountId,
        inputAmount,
        inputTokenId,
        outputTokenId,
        errorMessage,
        errorDetail,
        errorCode,
        previousStatus: 'SubmittingTransaction',
      }),
      reset: () => initialState,
    },
    Queued: {
      reset: () => initialState,
    },
    Error: {
      // Re-enters Preparing with the original request intact — makeQuote fires
      // on the Preparing state, so the retry re-quotes the same amount/tokens
      // and the Review sheet re-populates without the user re-entering anything.
      retryRequested: ({
        kind,
        accountId,
        inputAmount,
        inputTokenId,
        outputTokenId,
      }) => ({
        status: 'Preparing',
        kind,
        accountId,
        inputAmount,
        inputTokenId,
        outputTokenId,
      }),
      reset: () => initialState,
    },
  },
);

export type RealFiFlowEvent = EventOf<typeof realfiFlowMachine>;
