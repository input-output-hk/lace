import { ActivityType } from '@lace-contract/activities';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { makeConfirmTx, makeSubmitTx } from '@lace-contract/tx-executor';
import { BigNumber, Timestamp } from '@lace-lib/util';
import {
  dropStaleResult,
  firstStateOfStatus,
  serializeError,
} from '@lace-lib/util-store';
import {
  catchError,
  from,
  merge,
  mergeMap,
  of,
  switchMap,
  withLatestFrom,
} from 'rxjs';

import type {
  DelegationFlowState,
  DelegationStateCalculatingFees,
} from './types';
import type { SideEffect } from '../contract';
import type { BuildDelegationTx } from '@lace-contract/cardano-context';
import type { LaceInit } from '@lace-contract/module';
import type { ConfirmTx, SubmitTx } from '@lace-contract/tx-executor';
import type { AnyWallet } from '@lace-contract/wallet-repo';

// Statuses in which the machine handles each side-effect's RESULT event (see
// `state-machine.ts`). A result arriving while the machine is outside these — a race,
// or a close-all teardown — is stale and dropped (see `dropStaleResult`), otherwise the
// machine throws "handler not found for status X and event Y". Keep in sync with the
// state machine's handlers.
const FEE_CALCULATION_HANDLED_STATES = new Set<DelegationFlowState['status']>([
  'CalculatingFees',
]);
const CONFIRMATION_HANDLED_STATES = new Set<DelegationFlowState['status']>([
  'AwaitingConfirmation',
]);
const PROCESSING_HANDLED_STATES = new Set<DelegationFlowState['status']>([
  'Processing',
]);

type MakeFeeCalculationParams = {
  buildDelegationTx: BuildDelegationTx;
};

export const makeFeeCalculation =
  ({ buildDelegationTx }: MakeFeeCalculationParams): SideEffect =>
  (
    _,
    { delegationFlow: { selectDelegationFlowState$ }, wallets: { selectAll$ } },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectDelegationFlowState$, 'CalculatingFees').pipe(
      withLatestFrom(selectAll$),

      switchMap(
        ([state, wallets]: [
          DelegationStateCalculatingFees,
          readonly AnyWallet[],
        ]) => {
          const { accountId, poolId } = state;

          const walletWithAccount = wallets.find(w =>
            w.accounts.some(a => a.accountId === accountId),
          );
          const wallet = walletWithAccount ?? wallets[0];
          const account = wallet?.accounts.find(a => a.accountId === accountId);

          if (!wallet || !account) {
            logger.error('No wallet or account found for delegation');
            return of(
              actions.delegationFlow.feeCalculationFailed({
                errorMessage: 'No wallet or account found for delegation',
                errorTranslationKeys: {
                  title: 'v2.staking.delegation.error.title',
                  subtitle: 'v2.staking.delegation.error.subtitle',
                },
              }),
            );
          }

          if (account.blockchainName !== 'Cardano') {
            logger.error('Delegation is only supported for Cardano accounts');
            return of(
              actions.delegationFlow.feeCalculationFailed({
                errorMessage:
                  'Delegation is only supported for Cardano accounts',
                errorTranslationKeys: {
                  title: 'v2.staking.delegation.error.title',
                  subtitle: 'v2.staking.delegation.error.subtitle',
                },
              }),
            );
          }

          return buildDelegationTx({ accountId, poolId }).pipe(
            switchMap(result => {
              if (!result.success) {
                logger.error(
                  'Failed to build delegation transaction',
                  result.error,
                );
                return of(
                  actions.delegationFlow.feeCalculationFailed({
                    errorMessage: result.error.message,
                    errorTranslationKeys: {
                      title: 'v2.staking.delegation.error.title',
                      subtitle: 'v2.staking.delegation.error.subtitle',
                    },
                  }),
                );
              }

              return of(
                actions.delegationFlow.feeCalculationCompleted({
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
                actions.delegationFlow.feeCalculationFailed({
                  errorMessage: String(error),
                  errorTranslationKeys: {
                    title: 'v2.staking.delegation.error.title',
                    subtitle: 'v2.staking.delegation.error.subtitle',
                  },
                }),
              );
            }),
          );
        },
      ),
      dropStaleResult(
        selectDelegationFlowState$,
        action =>
          actions.delegationFlow.feeCalculationCompleted.match(action) ||
          actions.delegationFlow.feeCalculationFailed.match(action),
        FEE_CALCULATION_HANDLED_STATES,
      ),
    );

export const makeDelegationAwaitingConfirmation =
  ({ confirmTx }: { confirmTx: ConfirmTx }): SideEffect =>
  (
    _,
    { delegationFlow: { selectDelegationFlowState$ } },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectDelegationFlowState$, 'AwaitingConfirmation').pipe(
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
            actions.delegationFlow.confirmationCompleted({
              result,
            }),
        ).pipe(
          catchError(error => {
            logger.error('Delegation confirmation failed unexpectedly', error);
            return of(
              actions.delegationFlow.confirmationCompleted({
                result: {
                  success: false,
                  error: serializeError(error),
                  errorTranslationKeys: {
                    title: 'v2.staking.delegation.error.title',
                    subtitle: 'v2.staking.delegation.error.subtitle',
                  },
                },
              }),
            );
          }),
        ),
      ),
      dropStaleResult(
        selectDelegationFlowState$,
        actions.delegationFlow.confirmationCompleted.match,
        CONFIRMATION_HANDLED_STATES,
      ),
    );

export const makeDelegationProcessing =
  ({ submitTx }: { submitTx: SubmitTx }): SideEffect =>
  (
    _,
    { delegationFlow: { selectDelegationFlowState$ } },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectDelegationFlowState$, 'Processing').pipe(
      switchMap(state =>
        submitTx(
          {
            accountId: state.accountId,
            serializedTx: state.serializedTx,
            blockchainName: 'Cardano',
            blockchainSpecificSendFlowData: {},
          },
          result => result,
        ).pipe(
          mergeMap(value => {
            if (!('success' in value)) {
              return of(value);
            }

            const result = value;

            if (result.success) {
              const feeChanges = state.fees.map(fee => ({
                tokenId: LOVELACE_TOKEN_ID,
                amount: BigNumber(-BigNumber.valueOf(fee.amount)),
              }));
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
              };

              return from([
                actions.activities.upsertActivities({
                  accountId: state.accountId,
                  activities: [pendingActivity],
                }),
                actions.delegationFlow.processingResulted({ result }),
              ]);
            }

            return of(actions.delegationFlow.processingResulted({ result }));
          }),
          catchError(error => {
            logger.error('Delegation processing failed unexpectedly', error);
            return of(
              actions.delegationFlow.processingResulted({
                result: {
                  success: false,
                  error: serializeError(error),
                  errorTranslationKeys: {
                    title: 'v2.staking.delegation.error.title',
                    subtitle: 'v2.staking.delegation.error.subtitle',
                  },
                },
              }),
            );
          }),
        ),
      ),
      dropStaleResult(
        selectDelegationFlowState$,
        actions.delegationFlow.processingResulted.match,
        PROCESSING_HANDLED_STATES,
      ),
    );

export const initializeSideEffects: LaceInit<SideEffect[]> = async ({
  loadModules,
}) => {
  // Delegation is currently Cardano-only, so we use the first (Cardano) builder
  const [makeBuildDelegationTx] = await loadModules(
    'addons.loadDelegationTxBuilder',
  );

  return [
    (actionObservables, stateObservables, dependencies) => {
      const buildDelegationTx = makeBuildDelegationTx(dependencies);
      return merge(
        ...[
          makeFeeCalculation({ buildDelegationTx }),
          makeDelegationAwaitingConfirmation({
            confirmTx: makeConfirmTx(actionObservables.txExecutor),
          }),
          makeDelegationProcessing({
            submitTx: makeSubmitTx(actionObservables.txExecutor),
          }),
        ].map(sideEffect =>
          sideEffect(actionObservables, stateObservables, dependencies),
        ),
      );
    },
  ];
};
