// The guest's per-account "reset sync state" (ADR 47) — the shell twin of the
// monolith's createResetSyncStateSideEffect (@lace-module/midnight-sync
// store/side-effects/resync.ts). The persisted Midnight state it clears lives
// HOST-side (the offscreen engine's checkpoint, one key per account), so the
// guest cannot wipe it itself: it asks the host to stop the account's engine
// session and delete the checkpoint, then resets its OWN sync-derived caches and
// reloads. Sync restarts by itself afterwards — the watch poller sees the engine
// cold and pokes `requestSync` (store/side-effects/watch.ts).

import { midnightAccounts$ } from '@lace-contract/midnight-context';
import {
  catchError,
  EMPTY,
  mergeMap,
  of,
  switchMap,
  withLatestFrom,
} from 'rxjs';

import type { SideEffect } from '../..';
import type { MidnightAccountId } from '@lace-contract/midnight-context';

/**
 * Clear one Midnight account's persisted sync state, host side and guest side,
 * then reload.
 *
 * - HOST-CALL FIRST, and only then the resets: the host stop halts the engine's
 *   persistence before its checkpoint is deleted, so no in-flight flush revives
 *   what the guest is about to forget.
 * - `switchMap`, not `exhaustMap`: if the host call hangs — the wedged-account
 *   case this control exists to rescue — `exhaustMap` would ignore every later
 *   reset for the session, while a repeat press supersedes the hung call.
 * - A FAILED host call still resets and reloads (the monolith posture): the
 *   guest-side caches are worth clearing on their own, and stranding the account
 *   until the user retries is the worse outcome.
 * - FEATURE-GATED (ADR 41 handshake): against an older host without the
 *   capability the reset is a silent no-op rather than a doomed call — a reload
 *   that cleared the guest caches while the host kept serving the same bad
 *   checkpoint would repopulate them within a poll tick.
 * - The reload is emitted LAST: it flush-gates persisted state
 *   (@lace-contract/app side effects), so sequencing it after the resets is what
 *   stops the reload from preempting them.
 */
export const resetSyncState: SideEffect = (
  { midnightContext: { resetSyncState$ } },
  stateObservables,
  { actions, canResetMidnightSyncState, resetMidnightSyncState, logger },
) => {
  if (!canResetMidnightSyncState) return EMPTY;
  return resetSyncState$.pipe(
    withLatestFrom(midnightAccounts$(stateObservables)),
    switchMap(([{ payload }, midnightAccounts]) => {
      const account = midnightAccounts.find(
        ({ accountId }) => accountId === payload.accountId,
      );
      if (!account) return EMPTY;

      const { accountId, walletId, blockchainSpecific } = account;
      return resetMidnightSyncState({
        walletId,
        accountIndex: blockchainSpecific.accountIndex,
        network: blockchainSpecific.networkId,
      }).pipe(
        catchError(error => {
          logger.error('Midnight reset sync state: host reset failed', error);
          return of(undefined);
        }),
        mergeMap(result => {
          // `lace.request` never rejects — a host-side refusal arrives as a
          // typed `{ ok: false }`, which the catchError above never sees.
          if (result && !result.ok) {
            logger.error(
              'Midnight reset sync state: host reset failed',
              result.error,
            );
          }
          return [
            actions.addresses.resetAddresses({ accountId }),
            actions.tokens.resetAccountTokens({ accountId }),
            actions.activities.resetActivities({ accountId }),
            // midnightAccounts$ yields Midnight accounts only, so the id is a
            // MidnightAccountId (the dust caches' key type).
            actions.midnightContext.resetAccountDust({
              accountId: accountId as MidnightAccountId,
            }),
            actions.sync.resetAccountSyncStatus({ accountId }),
            actions.app.reloadApplication(),
          ];
        }),
      );
    }),
  );
};
