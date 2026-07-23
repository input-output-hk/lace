import { ActivityType } from '@lace-contract/activities';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { makeConfirmTx, makeSubmitTx } from '@lace-contract/tx-executor';
import { BigNumber, Timestamp } from '@lace-lib/util';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { from, merge, mergeMap, of, switchMap, withLatestFrom } from 'rxjs';

import type { SideEffect } from '..';
import type { ConfirmTx, FeeEntry, SubmitTx } from '@lace-contract/tx-executor';

// =====================================================================
// cNIGHT-on-Cardano DUST designation — confirm + submit.
// =====================================================================
// These side-effects depend on `@lace-contract/tx-executor`
// (`makeConfirmTx` / `makeSubmitTx`), whose import chain reaches
// `@lace-contract/authentication-prompt` → react / react-i18next. That
// makes them UNSAFE for the headless SDK bundle (ADR 30), so they live in
// a file that ONLY the full module entry (`index.ts`) composes — never the
// SDK entry (`sdk.ts`) nor the shared, SDK-reachable `store/init.ts`.
//
// This mirrors how `@lace-contract/send-flow` and
// `@lace-contract/staking-center` wire their own confirm/submit
// (`makeConfirmTx` / `makeSubmitTx`) in their contract side-effects rather
// than in blockchain-cardano's shared store, which is precisely why the
// SDK never bundles their tx-executor chain.
//
// The build half (`makeNightDesignationBuilding`) is SDK-safe (no
// tx-executor) and intentionally stays in `store/init.ts`: keeping the
// flag-gated Plutus build path in the always-statically-imported module
// store keeps it out of any `await import(...)` reached at SW cold boot
// (ADR 25).
//
// Wires:
//   AwaitingConfirmation → confirmTx → confirmationCompleted
//   Processing           → submitTx  → upsertActivities + processingResulted
//
// Each orchestrator is a factory taking its tx-executor dependency
// explicitly (mirrors staking-center's makeDelegationAwaitingConfirmation
// / makeDelegationProcessing) so unit tests can substitute a mock cold
// observable. `nightDesignationFlowTxSideEffects` wires the factories
// against the real tx-executor at runtime.
// =====================================================================

export const makeNightDesignationAwaitingConfirmation =
  ({ confirmTx }: { confirmTx: ConfirmTx }): SideEffect =>
  (_, stateObservables, { actions }) =>
    firstStateOfStatus(
      stateObservables.nightDesignationFlow.selectState$,
      'AwaitingConfirmation',
    ).pipe(
      withLatestFrom(stateObservables.wallets.selectAll$),
      switchMap(([state, wallets]) => {
        const wallet = wallets.find(w =>
          w.accounts.some(a => a.accountId === state.accountId),
        );
        if (!wallet) {
          return of(
            actions.nightDesignationFlow.confirmationCompleted({
              result: {
                success: false,
                errorTranslationKeys: {
                  title: 'v2.cnight-designation.build.error.title',
                  subtitle: 'v2.cnight-designation.build.error.subtitle',
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
          result =>
            actions.nightDesignationFlow.confirmationCompleted({ result }),
        );
      }),
    );

// Extracted from the submit-result handler so the mapper isn't a 5th-level
// nested function inside the switchMap → pipe → mergeMap chain (SonarCloud
// S2004). Fees are negative lovelace deltas on the pending activity.
const toLovelaceFeeChanges = (fees: FeeEntry[]) =>
  fees.map(fee => ({
    tokenId: LOVELACE_TOKEN_ID,
    amount: BigNumber(-BigNumber.valueOf(fee.amount)),
  }));

export const makeNightDesignationProcessing =
  ({ submitTx }: { submitTx: SubmitTx }): SideEffect =>
  (_, stateObservables, { actions }) =>
    firstStateOfStatus(
      stateObservables.nightDesignationFlow.selectState$,
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
                actions.nightDesignationFlow.processingResulted({
                  result: value,
                }),
              );
            }
            const feeChanges = toLovelaceFeeChanges(state.fees);
            // The pending activity carries `nightDesignation` metadata
            // (action + dustPubkeyHex) so the activity feed renders
            // the operation variant + target before the on-chain
            // classifier has had a chance to run. The classifier in
            // `mapTransactionToActivity` re-derives the same metadata
            // (minus dustPubkeyHex, which it can't extract without
            // PlutusData decode) on confirmation; this slice always
            // has dustPubkeyHex available because it came in via the
            // `designationRequested` payload.
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
            const blockchainSpecific = {
              Cardano: {
                consumedInputs: upstreamCardano?.consumedInputs ?? [],
                producedOutputs: upstreamCardano?.producedOutputs ?? [],
                nightDesignation: {
                  action: state.action,
                  ...(state.dustPubkeyHex === undefined
                    ? {}
                    : { dustPubkeyHex: state.dustPubkeyHex }),
                },
              },
            };
            const pendingActivity = {
              accountId: state.accountId,
              activityId: value.txId,
              timestamp: Timestamp(Date.now()),
              tokenBalanceChanges: feeChanges,
              type: ActivityType.Pending,
              blockchainSpecific,
            };
            return from([
              actions.activities.upsertActivities({
                accountId: state.accountId,
                activities: [pendingActivity],
              }),
              actions.nightDesignationFlow.processingResulted({
                result: value,
              }),
            ]);
          }),
        ),
      ),
    );

export const nightDesignationFlowTxSideEffects: SideEffect[] = [
  (actionObservables, stateObservables, dependencies) =>
    merge(
      makeNightDesignationAwaitingConfirmation({
        confirmTx: makeConfirmTx(actionObservables.txExecutor),
      })(actionObservables, stateObservables, dependencies),
      makeNightDesignationProcessing({
        submitTx: makeSubmitTx(actionObservables.txExecutor),
      })(actionObservables, stateObservables, dependencies),
    ),
];
