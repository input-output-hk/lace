import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { isInMemoryMidnightAccount } from '@lace-contract/midnight-context';
import { map, mergeMap, withLatestFrom, from } from 'rxjs';

import { MidnightSyncFailureId } from '../../value-objects/midnight-sync-failure-id.vo';

import type { SideEffect } from '../..';
import type { AnyAccount } from '@lace-contract/wallet-repo';

/**
 * Dismiss a Midnight account's sync failure once its own sync recovers.
 *
 * The `completeSyncOperation` for `${accountId}-midnight-sync` is the
 * "recovered" signal, whichever route got there — transparent retry, the
 * failure's tap-to-retry `restartWalletWatch`, or the resubscription `whileActive`
 * performs on unlock.
 *
 * Keyed per-account, so no lookup is needed: a completion for a sibling Midnight
 * account (or a Cardano/Bitcoin one) maps to a different, non-existent
 * MidnightSyncFailureId and no-ops, leaving a still-broken account's failure in
 * place until its OWN sync completes.
 */
export const autoDismissMidnightSyncFailureOnSyncSuccess: SideEffect = (
  { sync: { completeSyncOperation$ } },
  { failures: { selectFailureById$ } },
) =>
  completeSyncOperation$.pipe(
    map(({ payload }) => MidnightSyncFailureId(payload.accountId)),
    autoDismissFailureOnSuccess(selectFailureById$),
  );

/**
 * On resume, clear the sync failure for every Midnight account.
 *
 * Complements the per-account recovery dismissal above by clearing a stale error
 * immediately, rather than leaving it on screen for the length of the first sync
 * after unlock. No restart is dispatched: `watchMidnightAccounts` ends its pipe
 * with `whileActive`, so resuming already resubscribes every account watcher.
 * Accounts with no failure are a no-op.
 */
export const autoDismissMidnightSyncFailureOnResume: SideEffect = (
  _,
  { wallets: { selectAll$ }, failures: { selectFailureById$ } },
  { walletResumed$ },
) =>
  walletResumed$.pipe(
    withLatestFrom(selectAll$),
    mergeMap(([, wallets]) =>
      from(
        wallets
          .flatMap((wallet): AnyAccount[] => wallet.accounts)
          .filter(isInMemoryMidnightAccount)
          .map(account => MidnightSyncFailureId(account.accountId)),
      ),
    ),
    autoDismissFailureOnSuccess(selectFailureById$),
  );
