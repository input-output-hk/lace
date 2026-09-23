import { ActivityType } from '@lace-contract/activities';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { makeConfirmTx, makeSubmitTx } from '@lace-contract/tx-executor';
import { BigNumber, Timestamp } from '@lace-lib/util';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { from, merge, mergeMap, of, switchMap, withLatestFrom } from 'rxjs';

import type { SideEffect } from '..';
import type { ConfirmTx, FeeEntry, SubmitTx } from '@lace-contract/tx-executor';

// =====================================================================
// Transaction composer — confirm + submit.
// =====================================================================
// These side-effects depend on `@lace-contract/tx-executor`
// (`makeConfirmTx` / `makeSubmitTx`), whose import chain reaches
// `@lace-contract/authentication-prompt` → react / react-i18next. That
// makes them UNSAFE for the headless SDK bundle (ADR 30), so they live
// in a file that ONLY the full module entry (`index.ts`) composes —
// never the SDK entry (`sdk.ts`) nor the shared, SDK-reachable
// `store/init.ts`.
//
// Signing and submission deliberately reuse the same
// confirmTx → signer → submitTx path a normal Send takes, so a composed
// transaction gets the identical authorisation prompt and needs no new
// host API.
//
// Wires:
//   AwaitingConfirmation → confirmTx → confirmationCompleted
//   Processing           → submitTx  → upsertActivities + processingResulted
//
// Each orchestrator is a factory taking its tx-executor dependency
// explicitly so unit tests can substitute a mock cold observable.
// =====================================================================

export const makeComposerAwaitingConfirmation =
  ({ confirmTx }: { confirmTx: ConfirmTx }): SideEffect =>
  (_, stateObservables, { actions }) =>
    firstStateOfStatus(
      stateObservables.composerFlow.selectState$,
      'AwaitingConfirmation',
    ).pipe(
      withLatestFrom(stateObservables.wallets.selectAll$),
      switchMap(([state, wallets]) => {
        const wallet = wallets.find(w =>
          w.accounts.some(a => a.accountId === state.accountId),
        );
        if (!wallet) {
          return of(
            actions.composerFlow.confirmationCompleted({
              result: {
                success: false,
                errorTranslationKeys: {
                  title: 'v2.composer.build.error.title',
                  subtitle: 'v2.composer.build.error.subtitle',
                },
              },
            }),
          );
        }
        return confirmTx(
          {
            accountId: state.accountId,
            blockchainName: 'Cardano',
            blockchainSpecificSendFlowData: {},
            serializedTx: state.serializedTx,
            wallet,
          },
          result => actions.composerFlow.confirmationCompleted({ result }),
        );
      }),
    );

// Extracted so the mapper isn't a 5th-level nested function inside the
// switchMap → pipe → mergeMap chain (SonarCloud S2004). Fees are
// negative lovelace deltas on the pending activity.
const toLovelaceFeeChanges = (fees: FeeEntry[]) =>
  fees.map(fee => ({
    tokenId: LOVELACE_TOKEN_ID,
    amount: BigNumber(-BigNumber.valueOf(fee.amount)),
  }));

export const makeComposerProcessing =
  ({ submitTx }: { submitTx: SubmitTx }): SideEffect =>
  (_, stateObservables, { actions }) =>
    firstStateOfStatus(
      stateObservables.composerFlow.selectState$,
      'Processing',
    ).pipe(
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
            if (!value.success) {
              return of(
                actions.composerFlow.processingResulted({ result: value }),
              );
            }
            // The composer is intentionally generic, so the pending row
            // carries no operation metadata — only the fee as a known
            // balance change. Cardano's `mapTransactionToActivity`
            // classifier reconciles the type and the remaining balance
            // changes when the transaction confirms.
            const upstreamCardano = (
              value.blockchainSpecificActivityMetadata as
                | {
                    Cardano?: {
                      consumedInputs?: unknown[];
                      producedOutputs?: unknown[];
                    };
                  }
                | undefined
            )?.Cardano;
            const pendingActivity = {
              accountId: state.accountId,
              activityId: value.txId,
              timestamp: Timestamp(Date.now()),
              tokenBalanceChanges: toLovelaceFeeChanges(state.fees),
              type: ActivityType.Pending,
              blockchainSpecific: {
                Cardano: {
                  consumedInputs: upstreamCardano?.consumedInputs ?? [],
                  producedOutputs: upstreamCardano?.producedOutputs ?? [],
                },
              },
            };
            return from([
              actions.activities.upsertActivities({
                accountId: state.accountId,
                activities: [pendingActivity],
              }),
              actions.composerFlow.processingResulted({ result: value }),
            ]);
          }),
        ),
      ),
    );

export const composerFlowTxSideEffects: SideEffect[] = [
  (actionObservables, stateObservables, dependencies) =>
    merge(
      makeComposerAwaitingConfirmation({
        confirmTx: makeConfirmTx(actionObservables.txExecutor),
      })(actionObservables, stateObservables, dependencies),
      makeComposerProcessing({
        submitTx: makeSubmitTx(actionObservables.txExecutor),
      })(actionObservables, stateObservables, dependencies),
    ),
];
