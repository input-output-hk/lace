import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { EMPTY, filter, groupBy, map, mergeMap, of, pairwise } from 'rxjs';

import { CardanoSyncFailureId } from '../../value-objects';

import type { SideEffect } from '../../contract';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Tracks Cardano sync round failures and successes at the account level.
 *
 * This side effect:
 * - Watches `selectSyncStatusByAccount$` for sync round completions
 * - Detects completion when `pendingSync` transitions from defined → undefined
 * - Classifies the round by which outcome timestamp the slice moved:
 *   - Failure: `lastFailedSync` updated → add a failure (with manual retry)
 *   - Success: `lastSuccessfulSync` updated → auto-dismiss the failure
 *   - Neither: the round was DROPPED, not resolved — a deliberate
 *     `clearPendingSyncsForAccounts` (unlock, network switch) — so nothing is
 *     recorded. Do NOT infer failure from "no success" instead: that marks
 *     every such clear as a failed round, and the portfolio's initial-load
 *     gate reads the failure as a settled network, replacing the skeleton
 *     with the empty state for accounts that have simply not synced yet.
 * - Tracks each account independently using `groupBy`
 *
 * This provides the complete failure lifecycle (add + dismiss) in a single side effect.
 */
export const trackSyncRoundFailures: SideEffect = (
  _,
  { sync: { selectSyncStatusByAccount$ }, failures: { selectFailureById$ } },
  { actions },
) =>
  selectSyncStatusByAccount$.pipe(
    // Transform map to array of [accountId, status] tuples
    map(syncStatusByAccount => Object.entries(syncStatusByAccount)),

    // Flatten to stream of individual account updates
    mergeMap(entries => entries),

    // Group by accountId to track each account independently
    // CRITICAL: groupBy MUST come before pairwise to track each account separately
    groupBy(([accountId]) => accountId),

    // For each account independently
    mergeMap(accountGroup$ =>
      accountGroup$.pipe(
        // Use pairwise to detect state transitions for this specific account
        pairwise(),

        // Detect sync round completion: pendingSync went from defined → undefined
        filter(
          ([[_, previousStatus], [__, currentStatus]]) =>
            previousStatus.pendingSync !== undefined &&
            currentStatus.pendingSync === undefined,
        ),

        mergeMap(([[_, previousStatus], [accountId, currentStatus]]) => {
          const failureId = CardanoSyncFailureId(accountId as AccountId);

          if (currentStatus.lastFailedSync !== previousStatus.lastFailedSync) {
            // Add failure with manual retry action
            return of(
              actions.failures.addFailure({
                failureId,
                message:
                  'sync.error.cardano-sync-round-failed' as TranslationKey,
                retryAction: actions.cardanoContext.retrySyncRound(),
              }),
            );
          }

          if (
            currentStatus.lastSuccessfulSync !==
            previousStatus.lastSuccessfulSync
          ) {
            // Auto-dismiss failure on success
            return of(failureId).pipe(
              autoDismissFailureOnSuccess(selectFailureById$),
            );
          }

          return EMPTY;
        }),
      ),
    ),
  );
