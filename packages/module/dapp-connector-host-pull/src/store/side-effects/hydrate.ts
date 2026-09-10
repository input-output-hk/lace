// The authorized-dapps bridge (ADR 41 `lace.dapps`): hydrate the
// authorizedDapps slice from the host grant table at store init, on every
// Authorized DApps view open, and on a user removal (revoke then re-pull), so
// the slice always converges on the host's one authoritative table. Pull-only
// (ADR 35 — no host-initiated events, no standing subscription that would keep
// the host SW alive, ADR 34): the view open is the pull cadence for grants the
// guest never observed (a host-side connect ceremony), so the sheet never
// renders a stale snapshot. See the module doc (../..).

import { concatMap, defer, EMPTY, filter, map, merge, tap } from 'rxjs';

import { authorizedDappsFromWire } from '../../mappers';

import type { SideEffect } from '../..';
import type { LaceResult } from '@lace-lib/extension-shell-api';

const isOk = <T>(
  result: LaceResult<T>,
): result is Extract<LaceResult<T>, { ok: true }> => result.ok;

const entryKey = (blockchain: string, dappId: string): string =>
  `${blockchain}:${dappId}`;

export const hydrateAuthorizedDapps: SideEffect = (
  { authorizedDapps: { authorizedDappsViewed$, removeAuthorizedDapp$ } },
  _stateObservables,
  {
    actions,
    canListAuthorizedDapps,
    canRevokeAuthorizedDapp,
    pullAuthorizedDapps,
    revokeAuthorizedDapp,
  },
) => {
  // FEATURE-GATED (ADR 41 handshake): an older host without `dapps.list`
  // makes the whole bridge a silent no-op — the sheet keeps rendering
  // whatever the slice holds (the persisted guest-side state).
  if (!canListAuthorizedDapps) return EMPTY;

  // `${blockchain}:${dappId}` → origin, refreshed by every successful pull:
  // the remove action carries only the dapp id (RemoveAuthorizedDappPayload)
  // while the host revokes by origin, so the origin is recovered from the
  // same snapshot the removed row was rendered from. A plain Map is enough —
  // it is only mutated from these two co-located streams (the contract
  // side-effects' cooled-down-origins precedent).
  const originByEntry = new Map<string, string>();

  // One pull → one wholesale hydration. A failed pull (wire error, ADR 15)
  // emits nothing — the slice keeps its current state and the next trigger
  // re-pulls.
  const hydrate$ = defer(() =>
    pullAuthorizedDapps().pipe(
      filter(isOk),
      tap(({ value }) => {
        originByEntry.clear();
        for (const entry of value) {
          originByEntry.set(
            entryKey(entry.blockchain, entry.dapp.id),
            entry.dapp.origin,
          );
        }
      }),
      map(({ value }) =>
        actions.authorizedDapps.setAuthorizedDapps(
          authorizedDappsFromWire(value),
        ),
      ),
    ),
  );

  // Every view open re-pulls: a grant written by a host-side connect ceremony
  // while the guest was already running is invisible until now (ADR 41 — no
  // grant-change event), so the sheet's open is the moment to reconverge on
  // the host table. concatMap serializes repeated opens into one pull each.
  const viewOpenedRehydrate$ = authorizedDappsViewed$.pipe(
    concatMap(() => hydrate$),
  );

  const revokeThenRehydrate$ = removeAuthorizedDapp$.pipe(
    concatMap(({ payload: { blockchainName, dapp } }) => {
      // An older host without `dapps.revoke` keeps the reducer's optimistic
      // removal as the (guest-local) outcome rather than firing a doomed call.
      if (!canRevokeAuthorizedDapp) return EMPTY;
      // Host-written grants carry id === origin, so the fallback covers an
      // entry the pull has not served this session (unreachable via the
      // sheet, which renders only hydrated entries).
      const origin =
        originByEntry.get(entryKey(blockchainName, dapp.id)) ?? dapp.id;
      return revokeAuthorizedDapp({ blockchain: blockchainName, origin }).pipe(
        // Revoked or not (an unmatched entry answers revoked: false, and a
        // wire error is an error result — `request` never rejects), re-pull
        // so the slice reconverges on the host table.
        concatMap(() => hydrate$),
      );
    }),
  );

  return merge(hydrate$, viewOpenedRehydrate$, revokeThenRehydrate$);
};
