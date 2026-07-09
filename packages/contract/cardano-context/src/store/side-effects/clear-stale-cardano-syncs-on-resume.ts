import { map, withLatestFrom } from 'rxjs';

import { isCardanoAccount } from '../../util';

import type { SideEffect } from '../../contract';

/**
 * Drops `pendingSync` for every Cardano account each time the wallet
 * resumes from a paused period (`Unlocking → Unlocked`).
 *
 * Cardano sync rounds use `tipHash`-based operation IDs (see
 * `createSyncOperationId`), so the in-flight operations at lock time are
 * never completed by the post-resume round — it generates fresh IDs from
 * the new tip. Without this clear the stale entries persist forever and
 * `selectGlobalSyncStatus` returns `'syncing'` indefinitely.
 *
 * Triggered by `walletResumed$` rather than a rising edge on
 * `isWalletActive$`: `isWalletActive$` also rises on
 * `Preparing → AwaitingSetup` (first-run boot) and
 * `AwaitingSetup → Unlocked` (first-run setup), neither of which follows
 * a pause that would leave stale syncs behind.
 *
 * Scoped to Cardano accounts only. Bitcoin (`${accountId}-bitcoin-sync`)
 * and Midnight (`${accountId}-midnight-sync`) use stable per-account IDs;
 * their operations are updated in place by the next emission and must
 * NOT be cleared — clearing leaves a gap that surfaces as "syncing
 * without percentage" for accounts that have never reached
 * `lastSuccessfulSync`.
 *
 * See ADR 25.
 */
export const clearStaleCardanoSyncsOnResume: SideEffect = (
  _,
  { wallets: { selectActiveNetworkAccounts$ } },
  { actions, walletResumed$ },
) =>
  walletResumed$.pipe(
    withLatestFrom(selectActiveNetworkAccounts$),
    map(([, accounts]) =>
      actions.sync.clearPendingSyncsForAccounts({
        accountIds: accounts
          .filter(isCardanoAccount)
          .map(account => account.accountId),
      }),
    ),
  );
