import type { MidnightAccountRef } from './lace-client';
import type {
  LaceResult,
  MidnightResetSyncStateResult,
  MidnightStateSnapshot,
  MidnightSyncStatus,
  SetActiveNetworkResult,
} from '@lace-lib/extension-shell-api';
import type { Observable } from 'rxjs';

/**
 * Guest-side side-effect dependencies this module injects for the Midnight watch
 * poller, the active-network write-back and the per-account sync-state reset.
 * Each wraps a host `window.lace` call (a promise) or a feature-detect at the
 * dependency layer (ADR 19) so the
 * side effects never call the host inline — they stay marble-testable and
 * Storybook-stubbable. Neither pull read ever prompts (ADR 47), which is why the
 * poll can carry them but not `requestSync`.
 */
export interface MidnightHostPullDependencies {
  /** Pull-only sync status of the account (wraps `midnight.getSyncStatus`). */
  pullMidnightSyncStatus: (
    ref: MidnightAccountRef,
  ) => Observable<LaceResult<MidnightSyncStatus>>;
  /** Pull-only state snapshot of the account (wraps `midnight.getState`);
   * `null` when nothing is known yet. */
  pullMidnightState: (
    ref: MidnightAccountRef,
  ) => Observable<LaceResult<MidnightStateSnapshot | null>>;
  /** (Re)start host sync for the account (wraps `midnight.requestSync`) — the
   * ONE prompt-capable Midnight read: it mounts the host unlock surface when the
   * offscreen engine's keys are cold (ADR 34/47). The watch poller fires it ONCE
   * per cold episode (never per tick, which ADR 47 warns cold-mounts the prompt
   * over unrelated ceremonies) so a reload re-starts sync and re-prompts. */
  requestMidnightSync: (
    ref: MidnightAccountRef,
  ) => Observable<LaceResult<{ syncId: string }>>;
  /** The guest regaining attention — window `focus` / the document becoming
   * visible again after a host ceremony window closed (ADR 34 stand-in for the
   * absent completion push). The watch merges it into the poll so an unlock
   * refreshes Midnight state IMMEDIATELY on focus hand-back, not only on the next
   * fixed-interval tick. Emits nothing outside a DOM context (RN). Mirrors
   * cardano-host-pull's `windowRefocus$` — duplicated, not imported (ADR 14). */
  windowRefocus$: Observable<void>;
  /**
   * Whether the host advertised the `settings.setActiveNetwork` capability
   * (ADR 41 handshake), snapshotted at store init. False against an older host
   * → the active-network write-back side effect no-ops silently.
   */
  canSetActiveMidnightNetwork: boolean;
  /**
   * Record the guest's active Midnight network with the host (ADR 41
   * lace.settings), wrapping the `settings.setActiveNetwork` request as an
   * Observable (ADR 19). The Midnight dapp leg binds its connect approval to it.
   */
  pushActiveMidnightNetwork: (
    networkId: string,
  ) => Observable<LaceResult<SetActiveNetworkResult>>;
  /**
   * Whether the host advertised the `midnight.requestResetSyncState` capability
   * (ADR 41 handshake), snapshotted at store init. False against an older host
   * → the reset-sync-state side effect no-ops silently: the checkpoint the reset
   * exists to drop is host state the guest cannot reach.
   */
  canResetMidnightSyncState: boolean;
  /**
   * Stop the account's host engine session and delete its persisted sync
   * checkpoint (ADR 47), wrapping the `midnight.requestResetSyncState` request
   * as an Observable (ADR 19). The guest cannot do this itself — the checkpoint
   * is host-side state.
   */
  resetMidnightSyncState: (
    ref: MidnightAccountRef,
  ) => Observable<LaceResult<MidnightResetSyncStateResult>>;
}

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends MidnightHostPullDependencies {}
}
