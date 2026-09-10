import {
  catchError,
  defer,
  EMPTY,
  filter,
  ignoreElements,
  map,
  retry,
  switchMap,
} from 'rxjs';

import {
  ACTIVE_NETWORK_PUSH_RETRIES,
  ACTIVE_NETWORK_PUSH_RETRY_DELAY_MS,
} from '../../const';

import type { SideEffect } from '../..';

/**
 * Write the guest's active Midnight network back to the host (ADR 41
 * `lace.settings`) on boot and on every change, so the host's Midnight dapp leg
 * binds a connect approval to the account on the network the guest is on — and
 * therefore answers `getNetworkId` / `getConnectionStatus` / `getConfiguration`
 * for that network, over its service endpoints and its engine session (ADR 50).
 * The host holds no active-network context of its own (ADR 33), so without this
 * write-back every connect binds the wallet's primary servable Midnight account
 * regardless of what the guest is showing.
 *
 * The network rides as the SDK network id STRING (the identity Midnight accounts
 * and engine sessions are keyed by), not the guest's opaque
 * `BlockchainNetworkId` — mirror of the Cardano write-back riding the magic.
 *
 * Write-through only — it dispatches NO action (the host record is the effect).
 *
 * - FEATURE-GATED (ADR 41 handshake): an older host without the
 *   `settings.setActiveNetwork` capability (`canSetActiveMidnightNetwork` false)
 *   makes this a silent no-op — the guest degrades rather than firing a doomed
 *   call.
 * - WIRE-ERROR TOLERANT (ADR 15): a failed write-back is retried, then swallowed
 *   — it never breaks the guest, and the host meanwhile binds its primary
 *   servable Midnight account.
 */
export const pushActiveNetwork: SideEffect = (
  _,
  { midnightContext: { selectNetworkId$ } },
  { canSetActiveMidnightNetwork, pushActiveMidnightNetwork },
) => {
  if (!canSetActiveMidnightNetwork) return EMPTY;
  // The dedupe latch. It advances ONLY on a recorded push, because a rejected
  // wire call is not how a failure arrives: `lace.request` never rejects, it
  // answers a typed `{ ok: false }`. Deduping on the emitted value alone would
  // therefore treat a failed write-back as recorded and suppress every later
  // push, leaving the host binding dapp connects to the wrong network for the
  // rest of the session.
  let recordedNetworkId: string | undefined;
  return selectNetworkId$.pipe(
    filter(networkId => networkId !== recordedNetworkId),
    switchMap(networkId =>
      defer(() => pushActiveMidnightNetwork(networkId)).pipe(
        map(result => {
          if (!result.ok) throw new Error(result.error.message);
          recordedNetworkId = networkId;
          return result;
        }),
        retry({
          count: ACTIVE_NETWORK_PUSH_RETRIES,
          delay: ACTIVE_NETWORK_PUSH_RETRY_DELAY_MS,
        }),
        catchError(() => EMPTY),
        ignoreElements(),
      ),
    ),
  );
};
