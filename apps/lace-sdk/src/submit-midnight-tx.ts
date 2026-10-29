import { ActivityType } from '@lace-contract/activities';
import { derivePendingActivityFromMidnightTx } from '@lace-module/dapp-connector-midnight/sdk';
import { addressFromKey } from '@midnight-ntwrk/ledger-v8';
import {
  catchError,
  defaultIfEmpty,
  defer,
  map,
  of,
  ReplaySubject,
  share,
  startWith,
  switchMap,
  take,
  throwError,
  timeout,
  withLatestFrom,
} from 'rxjs';

import { MidnightSubmitTimeoutError } from './midnight-errors';
import { resolveTimeoutMs } from './midnight-timeouts';
import { withMidnightWallet } from './midnight-wallet';

import type {
  MidnightAccountProps,
  WalletWithMidnight,
} from './midnight-wallet';
import type { MidnightFinalizedTx } from './prove-midnight-tx';
import type { Activity } from '@lace-contract/activities';
import type { MidnightWallet } from '@lace-contract/midnight-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Result } from '@lace-lib/util';
import type { Observable } from 'rxjs';

const DEFAULT_SUBMIT_TIMEOUT_MS = 5 * 60_000;
// The coin read that feeds the Pending row is best effort: a wallet whose state does not settle in this time is
// submitted without a row, so the read can delay a submission by at most this long and never fails it.
const PENDING_ROW_STATE_TIMEOUT_MS = 10_000;

/** The options of `submitMidnightTx`. */
export interface SubmitMidnightTxProps extends MidnightAccountProps {
  transaction: MidnightFinalizedTx;
  /**
   * How long, in milliseconds, to wait for the node to report the transaction final; 5 minutes by default. A
   * value that is not a finite positive number up to 2^31 - 1 (the longest delay a timer honours) is refused
   * with a `RangeError` before anything is submitted. It
   * bounds the wait for finality, not for broadcast: when it elapses the transaction may already be on chain,
   * and the engine's submission is not cancelled. The coin read for the Pending row has its own bound of 10
   * seconds: it never fails the submission and delays it by at most that long.
   */
  submitTimeout?: number;
}

type ActivitiesByAccount = Record<AccountId, Activity[]>;
type Dispatch = NonNullable<WalletWithMidnight['dispatch']>;
type NightUtxos = Parameters<
  typeof derivePendingActivityFromMidnightTx
>[0]['nightUtxos'];

/** Records the Pending activity unless the account already has a confirmed row for the transaction. */
const recordPendingActivity = ({
  dispatch,
  activities,
  midnightWallet,
  transaction,
  utxos,
}: {
  dispatch: Dispatch;
  activities: ActivitiesByAccount;
  midnightWallet: MidnightWallet;
  transaction: MidnightFinalizedTx;
  utxos: NightUtxos;
}): Activity | undefined => {
  try {
    const activity = derivePendingActivityFromMidnightTx({
      deserializedTx: transaction,
      accountId: midnightWallet.accountId,
      ownUserAddressHex: addressFromKey(midnightWallet.nightVerifyingKey),
      nightUtxos: utxos,
      networkId: midnightWallet.networkId,
    });
    if (!activity) return undefined;
    const current = activities[activity.accountId]?.find(
      row => row.activityId === activity.activityId,
    );
    if (current && current.type !== ActivityType.Pending) return undefined;
    dispatch('activities.upsertActivities', {
      accountId: activity.accountId,
      activities: [activity],
    });
    return activity;
  } catch {
    // Tracking is best effort: a submission proceeds without its Pending row.
    return undefined;
  }
};

/**
 * Submits a proved transaction after consumer authorization and resolves once the node reports it final: the
 * engine submits at its `Finalized` stage, so `Ok` means the transaction is on chain. `txId` is the engine's
 * identifier, which is not the activity hash; the activity hash is `transaction.transactionHash()`.
 *
 * On an instance that tracks activities, the transaction's Pending activity, keyed by the activity hash, is
 * recorded when the submission is handed to the engine, before finality; the history sync then replaces it with
 * the confirmed row. The engine reports no acceptance before finality, so the row is written as soon as the call
 * is issued. When the engine fails the submission it releases the transaction's coins and the Pending row is
 * removed; if the transaction reaches the chain anyway, the history sync records it. Tracking failures never fail
 * a submission.
 *
 * An `Err` does not prove that nothing was broadcast. {@link MidnightSubmitTimeoutError} (`code`
 * `midnight-submit-timeout`) means the node did not report finality within `submitTimeout`: the transaction may
 * still reach the chain, and its Pending row stays. The SDK keeps listening to the engine's submission after the
 * timeout, for as long as that submission runs in this process: a failure it reports later removes the row, a
 * confirmation reaches the history sync. A row whose outcome this process never learns (it ends first) stays
 * until the history sync confirms it or the consumer removes it. The account-resolution errors
 * (`MidnightAccountNotFoundError`, `MidnightWalletNotReadyError`) precede the call and so precede any broadcast;
 * any other error is the engine's, and may also arrive after broadcast. Before retrying, check the account's
 * activities for the activity hash.
 */
export const submitMidnightTx = async (
  wallet: WalletWithMidnight,
  {
    transaction,
    submitTimeout: requestedSubmitTimeout,
    ...account
  }: SubmitMidnightTxProps,
): Promise<Result<{ txId: string }, Error>> =>
  withMidnightWallet(wallet, account, midnightWallet =>
    defer(() => {
      const submitTimeout = resolveTimeoutMs(
        'submitTimeout',
        requestedSubmitTimeout,
        DEFAULT_SUBMIT_TIMEOUT_MS,
      );
      const { dispatch } = wallet;
      const activities$ = dispatch
        ? wallet.stateObservables.activities?.selectAllMap$
        : undefined;
      // Missing tracking state must not delay or discard a submission.
      const latestActivities$ = activities$
        ? activities$.pipe(
            startWith(undefined),
            catchError(() => of(undefined)),
          )
        : of(undefined);
      // Read before submitting: submission can remove consumed coins at once. The wallet library moves a
      // transaction's own inputs from availableCoins to pendingCoins when it builds the transaction, so both
      // indexes are needed to recognise them.
      const utxos$ = activities$
        ? defer(() => midnightWallet.state()).pipe(
            take(1),
            map(state => [
              ...state.unshielded.availableCoins,
              ...state.unshielded.pendingCoins,
            ]),
            defaultIfEmpty(undefined),
            catchError(() => of(undefined)),
          )
        : of(undefined);

      // Removes the Pending row an engine failure makes stale, as the engine releases the transaction's
      // coins, unless the history sync has confirmed the transaction meanwhile.
      const removePendingRow = (pending: Activity) => {
        if (!dispatch || !activities$) return;
        activities$
          .pipe(
            take(1),
            catchError(() => of(undefined)),
          )
          .subscribe(latest => {
            const current = latest?.[pending.accountId]?.find(
              row => row.activityId === pending.activityId,
            );
            if (current?.type !== ActivityType.Pending) return;
            try {
              dispatch('activities.removeActivities', {
                accountId: pending.accountId,
                activityIds: [pending.activityId],
              });
            } catch {
              // The engine's error, not a tracking failure, is the result.
            }
          });
      };

      // Waits for finality. A timeout keeps the Pending row and stops waiting, but the engine's outcome is
      // still watched for as long as the submission runs, so a failure reported after the timeout removes
      // the row as a failure before it would. The source is subscribed once and its outcome replayed, so a
      // cold engine observable is not submitted twice.
      const settle = (
        finality$: Observable<string>,
        pending: Activity | undefined,
      ) => {
        const outcome$ = finality$.pipe(
          share({
            connector: () => new ReplaySubject<string>(1),
            resetOnError: false,
            resetOnComplete: false,
          }),
        );
        if (pending)
          outcome$.subscribe({
            next: () => undefined,
            error: () => {
              removePendingRow(pending);
            },
          });
        return outcome$.pipe(
          timeout({
            first: submitTimeout,
            with: () =>
              throwError(
                () =>
                  new MidnightSubmitTimeoutError(
                    transaction.transactionHash(),
                    submitTimeout,
                  ),
              ),
          }),
          map(txId => ({ txId })),
        );
      };

      return utxos$.pipe(
        timeout({
          first: Math.min(PENDING_ROW_STATE_TIMEOUT_MS, submitTimeout),
          with: () => of(undefined),
        }),
        switchMap(utxos => {
          // The engine settles a submission only at finality, so the Pending row is recorded once the call is
          // issued and before the timeout can fire.
          const finality$ = midnightWallet.submitTransaction(transaction);
          return of(utxos).pipe(
            // Sampled after the call, so a row the history sync confirmed meanwhile is never overwritten.
            withLatestFrom(latestActivities$),
            map(([coins, activities]) =>
              dispatch && activities && coins
                ? recordPendingActivity({
                    dispatch,
                    activities,
                    midnightWallet,
                    transaction,
                    utxos: coins,
                  })
                : undefined,
            ),
            switchMap(pending => settle(finality$, pending)),
          );
        }),
      );
    }),
  );
