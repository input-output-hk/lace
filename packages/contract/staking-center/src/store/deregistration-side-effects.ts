import { ActivityType } from '@lace-contract/activities';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { makeConfirmTx, makeSubmitTx } from '@lace-contract/tx-executor';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { BigNumber, Timestamp } from '@lace-sdk/util';
import {
  catchError,
  from,
  merge,
  mergeMap,
  of,
  switchMap,
  withLatestFrom,
} from 'rxjs';

import type { DeregistrationStateCalculatingFees } from './deregistration-types';
import type { SideEffect } from '../contract';
import type { BuildDeregistrationTx } from '@lace-contract/cardano-context';
import type { LaceInit } from '@lace-contract/module';
import type { ConfirmTx, SubmitTx } from '@lace-contract/tx-executor';
import type { AnyWallet } from '@lace-contract/wallet-repo';

type MakeDeregistrationFeeCalculationParams = {
  buildDeregistrationTx: BuildDeregistrationTx;
};

export const makeDeregistrationFeeCalculation =
  ({
    buildDeregistrationTx,
  }: MakeDeregistrationFeeCalculationParams): SideEffect =>
  (
    _,
    {
      deregistrationFlow: { selectDeregistrationFlowState$ },
      wallets: { selectAll$ },
    },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectDeregistrationFlowState$, 'CalculatingFees').pipe(
      withLatestFrom(selectAll$),

      switchMap(
        ([state, wallets]: [
          DeregistrationStateCalculatingFees,
          readonly AnyWallet[],
        ]) => {
          const { accountId } = state;

          const walletWithAccount = wallets.find(w =>
            w.accounts.some(a => a.accountId === accountId),
          );
          const wallet = walletWithAccount ?? wallets[0];
          const account = wallet?.accounts.find(a => a.accountId === accountId);

          if (!wallet || !account) {
            logger.error('No wallet or account found for deregistration');
            return of(
              actions.deregistrationFlow.feeCalculationFailed({
                errorMessage: 'No wallet or account found for deregistration',
                errorTranslationKeys: {
                  title: 'v2.staking.deregistration.error.title',
                  subtitle: 'v2.staking.deregistration.error.subtitle',
                },
              }),
            );
          }

          if (account.blockchainName !== 'Cardano') {
            logger.error(
              'Deregistration is only supported for Cardano accounts',
            );
            return of(
              actions.deregistrationFlow.feeCalculationFailed({
                errorMessage:
                  'Deregistration is only supported for Cardano accounts',
                errorTranslationKeys: {
                  title: 'v2.staking.deregistration.error.title',
                  subtitle: 'v2.staking.deregistration.error.subtitle',
                },
              }),
            );
          }

          return buildDeregistrationTx({ accountId }).pipe(
            switchMap(result => {
              if (!result.success) {
                logger.error(
                  'Failed to build deregistration transaction',
                  result.error,
                );
                return of(
                  actions.deregistrationFlow.feeCalculationFailed({
                    errorMessage: result.error.message,
                    errorTranslationKeys: {
                      title: 'v2.staking.deregistration.error.title',
                      subtitle: 'v2.staking.deregistration.error.subtitle',
                    },
                  }),
                );
              }

              return of(
                actions.deregistrationFlow.feeCalculationCompleted({
                  depositReturn: result.depositReturn,
                  fees: result.fees,
                  serializedTx: result.serializedTx,
                  wallet,
                }),
              );
            }),
            catchError(error => {
              logger.error(
                'Deregistration fee calculation: error building tx',
                error,
              );
              return of(
                actions.deregistrationFlow.feeCalculationFailed({
                  errorMessage: String(error),
                  errorTranslationKeys: {
                    title: 'v2.staking.deregistration.error.title',
                    subtitle: 'v2.staking.deregistration.error.subtitle',
                  },
                }),
              );
            }),
          );
        },
      ),
    );

export const makeDeregistrationAwaitingConfirmation =
  ({ confirmTx }: { confirmTx: ConfirmTx }): SideEffect =>
  (
    _,
    { deregistrationFlow: { selectDeregistrationFlowState$ } },
    { actions },
  ) =>
    firstStateOfStatus(
      selectDeregistrationFlowState$,
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
            actions.deregistrationFlow.confirmationCompleted({
              result,
            }),
        ),
      ),
    );

export const makeDeregistrationProcessing =
  ({ submitTx }: { submitTx: SubmitTx }): SideEffect =>
  (
    _,
    { deregistrationFlow: { selectDeregistrationFlowState$ } },
    { actions },
  ) =>
    firstStateOfStatus(selectDeregistrationFlowState$, 'Processing').pipe(
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
            // Pass through txPhaseRequested action (first emission)
            if (!('success' in value)) {
              return of(value);
            }

            // Handle submission result (second emission)
            const result = value;

            if (result.success) {
              const feeChanges = state.fees.map(fee => ({
                tokenId: LOVELACE_TOKEN_ID,
                amount: BigNumber(-BigNumber.valueOf(fee.amount)),
              }));

              // Deposit return is positive (user receives this back)
              const depositReturnAmount = BigInt(state.depositReturn || '0');
              const depositReturnChange =
                depositReturnAmount > 0n
                  ? [
                      {
                        tokenId: LOVELACE_TOKEN_ID,
                        amount: BigNumber(depositReturnAmount),
                      },
                    ]
                  : [];

              const pendingActivity = {
                accountId: state.accountId,
                activityId: result.txId,
                timestamp: Timestamp(Date.now()),
                tokenBalanceChanges: [...feeChanges, ...depositReturnChange],
                type: ActivityType.Pending,
              };

              return from([
                actions.activities.upsertActivities({
                  accountId: state.accountId,
                  activities: [pendingActivity],
                }),
                actions.deregistrationFlow.processingResulted({ result }),
              ]);
            }

            return of(
              actions.deregistrationFlow.processingResulted({ result }),
            );
          }),
        ),
      ),
    );

export const initializeDeregistrationSideEffects: LaceInit<
  SideEffect[]
> = async ({ loadModules }) => {
  const [makeBuildDeregistrationTx] = await loadModules(
    'addons.loadDeregistrationTxBuilder',
  );

  return [
    (actionObservables, stateObservables, dependencies) =>
      merge(
        ...[
          makeDeregistrationFeeCalculation({
            buildDeregistrationTx: makeBuildDeregistrationTx(dependencies),
          }),
          makeDeregistrationAwaitingConfirmation({
            confirmTx: makeConfirmTx(actionObservables.txExecutor),
          }),
          makeDeregistrationProcessing({
            submitTx: makeSubmitTx(actionObservables.txExecutor),
          }),
        ].map(sideEffect =>
          sideEffect(actionObservables, stateObservables, dependencies),
        ),
      ),
  ];
};
