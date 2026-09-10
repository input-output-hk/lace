import { ActivityType } from '@lace-contract/activities';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import {
  makeConfirmTx,
  makeSubmitTx,
  pendingActivityMetadata,
} from '@lace-contract/tx-executor';
import { BigNumber, Timestamp } from '@lace-lib/util';
import {
  PROVIDER_REQUEST_RETRY_CONFIG,
  isRetriableError,
} from '@lace-lib/util-provider';
import {
  dropStaleResult,
  firstStateOfStatus,
  serializeError,
} from '@lace-lib/util-store';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  defer,
  from,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  withLatestFrom,
} from 'rxjs';

import type {
  EarnRewardsFlowState,
  EarnRewardsStateCalculatingFees,
} from './types';
import type { SideEffect } from '../contract';
import type { BuildEarnRewardsTx } from '@lace-contract/cardano-context';
import type { LaceInit } from '@lace-contract/module';
import type { ConfirmTx, SubmitTx } from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';

const ERROR_TRANSLATION_KEYS = {
  title: 'v2.earn-rewards.error.title',
  subtitle: 'v2.earn-rewards.error.subtitle',
} as const;

const findAccountWallet = (
  wallets: readonly AnyWallet[],
  accountId: AccountId,
): AnyWallet | undefined =>
  wallets.find(wallet =>
    wallet.accounts.some(account => account.accountId === accountId),
  );

/** Negative lovelace balance changes for the pending activity, one per fee. */
const buildFeeChanges = (fees: readonly { amount: BigNumber }[]) =>
  fees.map(fee => ({
    tokenId: LOVELACE_TOKEN_ID,
    amount: BigNumber(-BigNumber.valueOf(fee.amount)),
  }));

// Statuses in which the machine handles each side-effect's RESULT event (see
// `state-machine.ts`). A result arriving while the machine is outside these — a
// race, or a close-all teardown — is stale and dropped (see `dropStaleResult`);
// otherwise `transition` logs "handler not found for status X and event Y" and
// no-ops (returns the state unchanged) — harmless, but dropping keeps logs clean.
// The same benign no-op absorbs a double-tapped Confirm/Retry.
const FEE_CALCULATION_HANDLED_STATES = new Set<EarnRewardsFlowState['status']>([
  'CalculatingFees',
]);
const CONFIRMATION_HANDLED_STATES = new Set<EarnRewardsFlowState['status']>([
  'AwaitingConfirmation',
]);
const PROCESSING_HANDLED_STATES = new Set<EarnRewardsFlowState['status']>([
  'Processing',
]);

type MakeFeeCalculationParams = {
  buildEarnRewardsTx: BuildEarnRewardsTx;
};

export const makeFeeCalculation =
  ({ buildEarnRewardsTx }: MakeFeeCalculationParams): SideEffect =>
  (
    _,
    {
      earnRewardsFlow: { selectEarnRewardsFlowState$ },
      wallets: { selectAll$ },
    },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectEarnRewardsFlowState$, 'CalculatingFees').pipe(
      withLatestFrom(selectAll$),

      switchMap(
        ([state, wallets]: [
          EarnRewardsStateCalculatingFees,
          readonly AnyWallet[],
        ]) => {
          const { accountId, poolId, dRep } = state;

          const wallet = findAccountWallet(wallets, accountId);
          const account = wallet?.accounts.find(a => a.accountId === accountId);

          if (!wallet || !account) {
            logger.error('No wallet or account found for earn-rewards');
            return of(
              actions.earnRewardsFlow.feeCalculationFailed({
                errorMessage: 'No wallet or account found for earn-rewards',
                errorTranslationKeys: ERROR_TRANSLATION_KEYS,
              }),
            );
          }

          if (account.blockchainName !== 'Cardano') {
            logger.error('Earn rewards is only supported for Cardano accounts');
            return of(
              actions.earnRewardsFlow.feeCalculationFailed({
                errorMessage:
                  'Earn rewards is only supported for Cardano accounts',
                errorTranslationKeys: ERROR_TRANSLATION_KEYS,
              }),
            );
          }

          return buildEarnRewardsTx({ accountId, poolId, dRep }).pipe(
            // ADR-15 transparent retry. Unwrap-throw first: the builder folds
            // ALL failures into a result, so a non-throwing stream would make
            // retryBackoff a no-op. Only retriable errors are thrown — a
            // non-retriable failure falls through to the Error state at once.
            // Safe to re-subscribe: the builder is a cold defer, so each retry
            // re-runs the whole build.
            map(result => {
              if (!result.success && isRetriableError(result.error)) {
                throw result.error;
              }
              return result;
            }),
            retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
            switchMap(result => {
              if (!result.success) {
                logger.error(
                  'Failed to build earn-rewards transaction',
                  result.error,
                );
                return of(
                  actions.earnRewardsFlow.feeCalculationFailed({
                    errorMessage: result.error.message,
                    errorTranslationKeys: ERROR_TRANSLATION_KEYS,
                  }),
                );
              }

              return of(
                actions.earnRewardsFlow.feeCalculationCompleted({
                  deposit: result.deposit,
                  fees: result.fees,
                  serializedTx: result.serializedTx,
                  wallet,
                }),
              );
            }),
            catchError(error => {
              logger.error('Fee calculation: error building tx', error);
              return of(
                actions.earnRewardsFlow.feeCalculationFailed({
                  errorMessage: String(error),
                  errorTranslationKeys: ERROR_TRANSLATION_KEYS,
                }),
              );
            }),
          );
        },
      ),
      dropStaleResult(
        selectEarnRewardsFlowState$,
        action =>
          actions.earnRewardsFlow.feeCalculationCompleted.match(action) ||
          actions.earnRewardsFlow.feeCalculationFailed.match(action),
        FEE_CALCULATION_HANDLED_STATES,
      ),
    );

export const makeEarnRewardsAwaitingConfirmation =
  ({ confirmTx }: { confirmTx: ConfirmTx }): SideEffect =>
  (
    _,
    { earnRewardsFlow: { selectEarnRewardsFlowState$ } },
    { actions, logger },
  ) =>
    firstStateOfStatus(
      selectEarnRewardsFlowState$,
      'AwaitingConfirmation',
    ).pipe(
      switchMap(({ serializedTx, wallet, accountId }) =>
        confirmTx(
          {
            accountId,
            blockchainName: 'Cardano',
            blockchainSpecificSendFlowData: {},
            serializedTx,
            wallet,
          },
          result =>
            actions.earnRewardsFlow.confirmationCompleted({
              result,
            }),
        ).pipe(
          catchError(error => {
            logger.error(
              'Earn-rewards confirmation failed unexpectedly',
              error,
            );
            return of(
              actions.earnRewardsFlow.confirmationCompleted({
                result: {
                  success: false,
                  error: serializeError(error),
                  errorTranslationKeys: ERROR_TRANSLATION_KEYS,
                },
              }),
            );
          }),
        ),
      ),
      dropStaleResult(
        selectEarnRewardsFlowState$,
        actions.earnRewardsFlow.confirmationCompleted.match,
        CONFIRMATION_HANDLED_STATES,
      ),
    );

export const makeEarnRewardsProcessing =
  ({ submitTx }: { submitTx: SubmitTx }): SideEffect =>
  (
    _,
    { earnRewardsFlow: { selectEarnRewardsFlowState$ } },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectEarnRewardsFlowState$, 'Processing').pipe(
      switchMap(state =>
        // ADR-15 transparent retry. Each attempt must be a FRESH submitTx call:
        // the executor entry-point shareReplay()s per call, so re-subscribing
        // one call would replay its cached failure instead of re-submitting.
        // defer mints a new execution per attempt; re-submitting the identical
        // signed tx is idempotent at the node. Only retriable folded failures
        // are thrown — non-retriable ones fall through to the Error state.
        defer(() =>
          submitTx(
            {
              accountId: state.accountId,
              serializedTx: state.serializedTx,
              blockchainName: 'Cardano',
              blockchainSpecificSendFlowData: {},
            },
            result => result,
          ).pipe(
            map(value => {
              if (
                'success' in value &&
                !value.success &&
                isRetriableError(value.error)
              ) {
                // Re-wrap: the folded error is a serialized plain object, and
                // copying its fields (incl. `reason`) keeps shouldRetry's
                // classification identical for the thrown value.
                throw Object.assign(
                  new Error(value.error?.message ?? 'Submission failed'),
                  value.error,
                );
              }
              return value;
            }),
          ),
        ).pipe(
          retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
          mergeMap(value => {
            if (!('success' in value)) {
              return of(value);
            }

            const result = value;

            if (result.success) {
              const feeChanges = buildFeeChanges(state.fees);
              const depositAmount = BigInt(state.deposit || '0');
              const depositChange =
                depositAmount > 0n
                  ? [
                      {
                        tokenId: LOVELACE_TOKEN_ID,
                        amount: BigNumber(-depositAmount),
                      },
                    ]
                  : [];

              const pendingActivity = {
                accountId: state.accountId,
                activityId: result.txId,
                timestamp: Timestamp(Date.now()),
                tokenBalanceChanges: [...feeChanges, ...depositChange],
                type: ActivityType.Pending,
                ...pendingActivityMetadata(result),
              };

              return from([
                actions.activities.upsertActivities({
                  accountId: state.accountId,
                  activities: [pendingActivity],
                }),
                actions.earnRewardsFlow.processingResulted({ result }),
              ]);
            }

            // Submission returned a failure Result (e.g. the node rejected the
            // delegation) — surface it; otherwise the flow errors silently.
            logger.error('Earn-rewards submission failed', result.error);
            return of(actions.earnRewardsFlow.processingResulted({ result }));
          }),
          catchError(error => {
            logger.error('Earn-rewards processing failed unexpectedly', error);
            return of(
              actions.earnRewardsFlow.processingResulted({
                result: {
                  success: false,
                  error: serializeError(error),
                  errorTranslationKeys: ERROR_TRANSLATION_KEYS,
                },
              }),
            );
          }),
        ),
      ),
      dropStaleResult(
        selectEarnRewardsFlowState$,
        actions.earnRewardsFlow.processingResulted.match,
        PROCESSING_HANDLED_STATES,
      ),
    );

export const initializeSideEffects: LaceInit<SideEffect[]> = async ({
  loadModules,
}) => {
  // Earn rewards is Cardano-only, so we use the first (Cardano) builder.
  const [makeBuildEarnRewardsTx] = await loadModules(
    'addons.loadEarnRewardsTxBuilder',
  );

  return [
    (actionObservables, stateObservables, dependencies) => {
      const buildEarnRewardsTx = makeBuildEarnRewardsTx(dependencies);
      return merge(
        ...[
          makeFeeCalculation({ buildEarnRewardsTx }),
          makeEarnRewardsAwaitingConfirmation({
            confirmTx: makeConfirmTx(actionObservables.txExecutor),
          }),
          makeEarnRewardsProcessing({
            submitTx: makeSubmitTx(actionObservables.txExecutor),
          }),
        ].map(sideEffect =>
          sideEffect(actionObservables, stateObservables, dependencies),
        ),
      );
    },
  ];
};
