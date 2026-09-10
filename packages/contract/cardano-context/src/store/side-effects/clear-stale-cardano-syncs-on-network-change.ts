import { isNotNil } from '@cardano-sdk/util';
import { distinctUntilChanged, filter, map, skip, withLatestFrom } from 'rxjs';

import { isCardanoAccount } from '../../util';

import type { SideEffect } from '../../contract';
import type { AnyAccount } from '@lace-contract/wallet-repo';

/**
 * Drops `pendingSync` for every Cardano account that is NOT on the newly-active
 * chain whenever the active Cardano network changes.
 *
 * A network switch retargets `selectActiveNetworkAccounts$`, so a sync round
 * still in flight for the previous network's accounts is orphaned: the
 * coordinate-sync round tracks those accounts' `tipHash`-based operation IDs,
 * and its executors (address discovery / transaction polling) are scoped to the
 * active-network accounts, so they can no longer complete them. The round's
 * `exhaustMap` therefore stays busy until its 60s timeout, and while busy it
 * drops the natural trigger's emission for the new network. `combineLatest`
 * never re-emits that context once the lock frees, so without this clear the
 * first round for the new network waits for the next tip poll
 * (`tipPollFrequency`, up to 60s) — the initial-load skeleton lingers that whole
 * time. Freeing the orphaned operations lets the coordinator complete and pick
 * up the post-switch `getTip` re-fetch (fired synchronously by `trackTip` on
 * chain change), starting the new network's round without waiting for a poll.
 *
 * Direct analogue of `clearStaleCardanoSyncsOnResume`. `lastSuccessfulSync` is
 * preserved (see `clearPendingSyncsForAccounts`), so switching back to a
 * previously-synced network does not re-show the initial-load skeleton.
 *
 * Cardano-only: Bitcoin/Midnight use stable per-account operation IDs updated in
 * place, so they must NOT be cleared (see `clearPendingSyncsForAccounts`).
 */
export const clearStaleCardanoSyncsOnNetworkChange: SideEffect = (
  _,
  { wallets: { selectAll$ }, cardanoContext: { selectChainId$ } },
  { actions },
) =>
  selectChainId$.pipe(
    filter(isNotNil),
    distinctUntilChanged((a, b) => a.networkMagic === b.networkMagic),
    // The first chain is the boot network — no prior network's round can be
    // orphaned yet, so react only to subsequent changes.
    skip(1),
    withLatestFrom(selectAll$),
    map(([activeChainId, wallets]) =>
      wallets
        .flatMap((wallet): AnyAccount[] => wallet.accounts)
        .filter(isCardanoAccount)
        .filter(
          account =>
            account.blockchainSpecific.chainId.networkMagic !==
            activeChainId.networkMagic,
        )
        .map(account => account.accountId),
    ),
    // A switch that orphans nothing (no account on the previous network) has
    // no round to free, so it must not dispatch.
    filter(accountIds => accountIds.length > 0),
    map(accountIds =>
      actions.sync.clearPendingSyncsForAccounts({ accountIds }),
    ),
  );
