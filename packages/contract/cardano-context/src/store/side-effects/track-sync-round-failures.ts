import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { filter, groupBy, map, mergeMap, of, pairwise } from 'rxjs';

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
 * - Distinguishes failure from success using `lastSuccessfulSync` update:
 *   - Failure: `pendingSync` cleared BUT `lastSuccessfulSync` not updated
 *   - Success: `pendingSync` cleared AND `lastSuccessfulSync` updated
 * - Adds failure when sync fails (with manual retry action)
 * - Auto-dismisses failure when sync succeeds
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

        // Handle both failure and success cases
        mergeMap(([[_, previousStatus], [accountId, currentStatus]]) => {
          const failureId = CardanoSyncFailureId(accountId as AccountId);

          // Check if lastSuccessfulSync was updated
          const hasFailed =
            currentStatus.lastSuccessfulSync ===
            previousStatus.lastSuccessfulSync;

          if (hasFailed) {
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

          // Auto-dismiss failure on success
          return of(failureId).pipe(
            autoDismissFailureOnSuccess(selectFailureById$),
          );
        }),
      ),
    ),
  );
