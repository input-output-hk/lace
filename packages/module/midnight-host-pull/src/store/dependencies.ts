import { midnightWallets$ } from '@lace-contract/midnight-context';
import { hasLaceCapability } from '@lace-lib/extension-shell-client';
import {
  debounceTime,
  EMPTY,
  filter,
  from,
  fromEvent,
  map,
  merge,
  NEVER,
  of,
  throwError,
} from 'rxjs';

import {
  getMidnightState,
  getMidnightSyncStatus,
  requestMidnightResetSyncState,
  requestMidnightSync,
  setActiveMidnightNetwork,
} from '../lace-client';

import type { MidnightHostPullDependencies } from '../augmentations';
import type { MidnightSideEffectsDependencies } from '@lace-contract/midnight-context';

/** Coalesces the focus + visibilitychange pair a single window activation
 * fires. Mirrors cardano-host-pull's WINDOW_REFOCUS_DEBOUNCE_MS (ADR 14 —
 * duplicated, not imported). */
const WINDOW_REFOCUS_DEBOUNCE_MS = 250;

/**
 * The guest regains attention (ADR 34 stand-in for the absent completion push):
 * window `focus` or the document becoming visible again after a host ceremony
 * window closed. Returns `NEVER` outside a DOM context (RN) so store init never
 * throws where `window`/`document` are absent. Mirrors cardano-host-pull's
 * `buildWindowRefocus$` — duplicated, not imported (ADR 14).
 */
const buildWindowRefocus$ =
  (): MidnightHostPullDependencies['windowRefocus$'] => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return NEVER;
    }
    return merge(
      fromEvent(window, 'focus').pipe(map(() => undefined)),
      fromEvent(document, 'visibilitychange').pipe(
        filter(() => document.visibilityState === 'visible'),
        map(() => undefined),
      ),
    ).pipe(debounceTime(WINDOW_REFOCUS_DEBOUNCE_MS));
  };

/**
 * The guest's side-effect dependencies (ADR 47). In the guest there is NO
 * offscreen engine — the engine lives host-side (ADR 34) and the guest pulls
 * state through `window.lace`.
 *
 * The `midnightDependencyContract` members are inert stubs that only satisfy the
 * contract's shape: nothing in the guest loadout consumes them (the monolith's
 * engine-coupled watch/tx-executor/signer that did are all in
 * `@lace-module/midnight-sync`, which the guest does not load — verified against
 * `@lace-module/blockchain-midnight`, the UI module the guest keeps).
 * `midnightWallets$` is the contract's own BehaviorSubject, never populated in
 * the guest (no engine handles); the lifecycle functions are inert.
 *
 * The two `pullMidnight*` members ARE consumed — by the watch poller
 * (store/side-effects/watch.ts). They wrap the host pull reads as Observables
 * (ADR 19) so the poll is injected rather than calling `window.lace` inline.
 * The `*ActiveMidnightNetwork` pair is consumed the same way by the
 * active-network write-back (store/side-effects/push-active-network.ts), and
 * the `*MidnightSyncState` pair by the per-account reset
 * (store/side-effects/reset-sync-state.ts).
 */
export const initializeMidnightDependencies = (): MidnightHostPullDependencies &
  MidnightSideEffectsDependencies => ({
  midnightWallets$,
  // No engine handles guest-side; a read never resolves a wallet.
  getMidnightWalletByAccountId: () => EMPTY,
  stopAllMidnightWallets: () => of(undefined),
  stopMidnightWallet: () => of(undefined),
  startMidnightAccountWallet: () =>
    throwError(
      () =>
        new Error(
          'midnight-host-pull: the Midnight engine is host-owned; the guest cannot start a wallet',
        ),
    ),
  pullMidnightSyncStatus: ref => from(getMidnightSyncStatus(ref)),
  pullMidnightState: ref => from(getMidnightState(ref)),
  requestMidnightSync: ref => from(requestMidnightSync(ref)),
  windowRefocus$: buildWindowRefocus$(),
  // Snapshotted once at store init (ADR 41 handshake): an older host without
  // the capability makes the active-network write-back no-op silently.
  canSetActiveMidnightNetwork: hasLaceCapability('settings.setActiveNetwork'),
  pushActiveMidnightNetwork: networkId =>
    from(setActiveMidnightNetwork(networkId)),
  // Snapshotted once at store init (ADR 41 handshake): an older host without
  // the capability makes the reset-sync-state side effect no-op silently.
  canResetMidnightSyncState: hasLaceCapability(
    'midnight.requestResetSyncState',
  ),
  resetMidnightSyncState: ref => from(requestMidnightResetSyncState(ref)),
});
