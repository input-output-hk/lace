// The guest's Midnight watch-parity poller (ADR 47). With no offscreen engine
// guest-side, this replaces the monolith's engine-subscription watch
// (@lace-module/midnight-sync store/side-effects/watch.ts) with a pull loop over
// `window.lace`: per watched wallet on the active Midnight network it pulls sync
// status + state (`getSyncStatus` + `getState`) and dispatches the SAME redux
// actions the monolith watch effects do (addresses / tokens / dust / public keys
// / sync-store / activities). A live host session stays warm because serving
// `getState` resets the engine's warm-key debounce (midnight-engine.ts
// `getSnapshot`) — the periodic pull needs no prompting poke to keep it alive.
// `requestSync` (the one prompt-capable read — it mounts the host unlock surface
// when keys are cold) is NEVER fired per tick (ADR 47 warns a per-tick
// requestSync cold-mounts the prompt over unrelated ceremonies). It fires only
// on EXPLICIT triggers: post-send (exposed-modules/tx-executor-implementation.ts)
// and a THROTTLED restart when the poll observes the engine gone cold (reload /
// SW death / warm-key expiry) for a wallet that has Midnight state — otherwise a
// reload would render the stale checkpoint projection forever with no prompt
// (ADR 34, D5/D8).
//
// KEYED OFF WALLETS, NOT hydrated Midnight accounts (deliberate): a Midnight
// account entity only appears in wallet-repo once the host engine has computed
// its publics and written them back (D3, on an EXPLICIT sync/unlock — never this
// poll) — so the loop cannot wait for the account to exist. It keys off the
// seed-bearing shells the cardano-host-pull hydrator projects
// (WATCHED_WALLET_TYPES) and drives account index 0 (Midnight is one account per
// wallet — see MidnightAccountId): pulling state for index 0 keeps the host's
// computed + written-back index consistent with the accountId this loop
// constructs for its dispatches.

import {
  MidnightAccountId,
  type MidnightSDKNetworkId,
} from '@lace-contract/midnight-context';
import { whileActive } from '@lace-contract/wallet-active-state';
import { WalletId, WalletType } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-lib/util';
import {
  catchError,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  filter,
  forkJoin,
  from,
  groupBy,
  ignoreElements,
  map,
  merge,
  mergeAll,
  mergeMap,
  share,
  switchMap,
  takeUntil,
  throttleTime,
  timer,
  withLatestFrom,
  type Observable,
} from 'rxjs';

import {
  COLD_RESTART_RETRY_INTERVAL_MS,
  FEATURE_FLAG_MIDNIGHT_UNSHIELDED,
  midnightSyncOperationId,
  STATE_POLL_INTERVAL_MS,
} from '../../const';
import {
  computeSyncPlan,
  snapshotToActivities,
  snapshotToAddressesPayload,
  snapshotToAddressTokenPayloads,
  snapshotToDustBalance,
  snapshotToDustGenerationDetails,
  snapshotToPublicKeys,
  snapshotToTokenMetadataPayload,
} from '../../mappers';

import type { ActionCreators, SideEffect } from '../..';
import type { ActionType } from '@lace-contract/module';
import type { SyncSliceState } from '@lace-contract/sync';
import type { AnyWallet } from '@lace-contract/wallet-repo';
import type {
  LaceResult,
  MidnightStateSnapshot,
  MidnightSyncStatus,
} from '@lace-lib/extension-shell-api';

type MidnightAction = ActionType<ActionCreators>;

/** Actions derived from a `midnight.getState` snapshot — the state half of the
 * monolith watch (addresses / tokens / metadata / dust / public keys /
 * activities). Pure given the mappers; time-free. */
type StateActionsInput = {
  accountId: ReturnType<typeof MidnightAccountId>;
  network: MidnightSDKNetworkId;
  snapshot: MidnightStateSnapshot;
  isUnshieldedEnabled: boolean;
  actions: ActionCreators;
  /** Whether the host engine is LIVE (the snapshot carries real balances). When
   * false the snapshot is the cold vault-public projection with EMPTY balances,
   * so the balance-bearing dispatches are skipped to avoid wiping the last-known
   * assets (see below). */
  includeBalances: boolean;
};

const buildStateActions = ({
  accountId,
  network,
  snapshot,
  isUnshieldedEnabled,
  actions,
  includeBalances,
}: StateActionsInput): MidnightAction[] => {
  // Addresses + public keys are STATIC per account (derived from the keys, not
  // the sync cursor), so they are dispatched even from the cold vault-public
  // projection — they never overwrite balances.
  const stateActions: MidnightAction[] = [
    actions.addresses.upsertAddresses(
      snapshotToAddressesPayload(accountId, snapshot, isUnshieldedEnabled),
    ),
    actions.midnightContext.setPublicKeys({
      accountId,
      publicKeys: snapshotToPublicKeys(snapshot),
    }),
  ];
  // The balance-bearing dispatches run ONLY when the engine is live. A COLD
  // projection carries EMPTY coins/dust/history, and upserting those empties
  // WIPES the last-known assets (`setAddressTokens` with an empty list deletes
  // the address's token entry). Skipping them while cold keeps the last live
  // balances visible during a lock / warm-key lapse / re-boot, so an unlock shows
  // the assets IMMEDIATELY (refreshed by the first live tick) instead of blanking
  // then refilling. Balances are per-account-and-network (the accountId embeds
  // the network), so keeping them never leaks another network's assets.
  if (!includeBalances) return stateActions;
  stateActions.push(
    ...snapshotToAddressTokenPayloads({
      accountId,
      snapshot,
      networkId: network,
      isUnshieldedEnabled,
    }).map(payload => actions.tokens.setAddressTokens(payload)),
    actions.tokens.upsertTokensMetadata(
      snapshotToTokenMetadataPayload(snapshot, network, isUnshieldedEnabled),
    ),
    actions.midnightContext.setDustBalance({
      accountId,
      ...snapshotToDustBalance(snapshot),
    }),
    actions.midnightContext.setDustGenerationDetails({
      accountId,
      dustGenerationDetails: snapshotToDustGenerationDetails(snapshot),
    }),
    actions.activities.upsertActivities({
      accountId,
      activities: snapshotToActivities(accountId, snapshot, network),
    }),
  );
  return stateActions;
};

/** Actions derived from a `midnight.getSyncStatus` snapshot — the determinate
 * per-account sync operation (ADR 12). Mirrors the monolith `updateSyncProgress`
 * add-vs-update decision keyed off the existing pending operation. */
type SyncActionsInput = {
  accountId: ReturnType<typeof MidnightAccountId>;
  status: MidnightSyncStatus;
  isUnshieldedEnabled: boolean;
  syncStatusByAccount: SyncSliceState['syncStatusByAccount'];
  actions: ActionCreators;
};

/** Operation states nothing further can move — re-failing one of these would
 * rewrite a settled outcome. */
const TERMINAL_SYNC_STATUSES: readonly string[] = ['Completed', 'Failed'];

const buildSyncActions = ({
  accountId,
  status,
  isUnshieldedEnabled,
  syncStatusByAccount,
  actions,
}: SyncActionsInput): MidnightAction[] => {
  const plan = computeSyncPlan(status, isUnshieldedEnabled);
  const operationId = midnightSyncOperationId(accountId);
  const existing =
    syncStatusByAccount[accountId]?.pendingSync?.operations[operationId];

  if (!plan) {
    // A cold engine reports NO progress, so there is nothing left to drive the
    // operation an earlier live tick added to a terminal state — and
    // `selectIsAccountSyncing` reads `pendingSync`, which only
    // complete/failSyncOperation clear. Failing it here stops the account
    // spinning "Syncing" for the rest of the session; the cold-restart poke
    // (below) is what actually re-starts the sync.
    return existing && !TERMINAL_SYNC_STATUSES.includes(existing.status)
      ? [
          actions.sync.failSyncOperation({
            accountId,
            operationId,
            error: 'sync.error.midnight-wallet-start-failed',
          }),
        ]
      : [];
  }

  const result: MidnightAction[] = [];

  if (!existing || existing.status === 'Pending') {
    result.push(
      actions.sync.addSyncOperation({
        accountId,
        operation: {
          operationId,
          status: 'InProgress',
          type: 'Determinate',
          progress: plan.progress,
          description: 'sync.operation.midnight-wallet-sync',
          startedAt: Timestamp(Date.now()),
        },
      }),
    );
  } else {
    result.push(
      actions.sync.updateSyncProgress({
        accountId,
        operationId,
        progress: plan.progress,
      }),
    );
  }

  if (plan.isComplete) {
    result.push(actions.sync.completeSyncOperation({ accountId, operationId }));
  }

  return result;
};

/** One host pull — the `getSyncStatus` + `getState` pair of a single tick. */
type HostPull = {
  status: LaceResult<MidnightSyncStatus>;
  state: LaceResult<MidnightStateSnapshot | null>;
};

/**
 * `distinctUntilChanged` comparator over the host pull. JSON compare is sound:
 * the wire carries only strings/numbers/booleans/null (no BigInt). The previous
 * value's serialization is cached, so a tick costs ONE `JSON.stringify` of the
 * full snapshot rather than two.
 */
const sameHostPull = () => {
  let previous: { pull: HostPull; json: string } | undefined;
  return (a: HostPull, b: HostPull): boolean => {
    if (previous?.pull !== a) previous = { pull: a, json: JSON.stringify(a) };
    const json = JSON.stringify(b);
    // `distinctUntilChanged` keeps `a` as previous on a match and adopts `b`
    // otherwise, so the memo tracks whichever it holds.
    if (previous.json === json) return true;
    previous = { pull: b, json };
    return false;
  };
};

/**
 * One wallet's poll loop: on a fixed interval (whileActive-gated by the caller)
 * pull sync status + state (`getSyncStatus` + `getState`) and dispatch the redux
 * actions. `exhaustMap` drops a tick that arrives while the previous host
 * round-trip is still in flight. A live host session stays warm because serving
 * `getState` resets the engine's warm-key debounce (midnight-engine.ts
 * `getSnapshot`); when the host reports the engine COLD for a Midnight wallet the
 * loop pokes `requestSync` to re-mount the unlock prompt and restart sync — at
 * most once per COLD_RESTART_RETRY_INTERVAL_MS, never per tick (ADR 34/47).
 */
const pollMidnightWallet =
  (
    walletId: string,
    network: MidnightSDKNetworkId,
    isUnshieldedEnabled$: Observable<boolean>,
  ): SideEffect =>
  (
    _actions,
    stateObservables,
    {
      actions,
      logger,
      pullMidnightSyncStatus,
      pullMidnightState,
      requestMidnightSync,
      windowRefocus$,
    },
  ) => {
    const accountId = MidnightAccountId(WalletId(walletId), 0, network);
    const ref = { walletId, accountIndex: 0, network };

    // The fixed-interval poll PLUS an immediate re-pull whenever the guest
    // regains attention (window focus / visibility). The host hands focus back
    // when its unlock ceremony window closes (ADR 34: no completion push), so
    // this refreshes Midnight state RIGHT AFTER an unlock instead of waiting up
    // to a full STATE_POLL_INTERVAL_MS for the next tick. `exhaustMap` drops a
    // refocus tick that lands while a poll is already in flight.
    //
    // The two pulls are CONTAINED (the state half's guard below, same reason):
    // a rejected host round-trip would otherwise error this pipe, tearing the
    // watch down for EVERY Midnight wallet until the app reloads. Skipping the
    // tick costs one interval — the next one recovers.
    const pulls$ = merge(timer(0, STATE_POLL_INTERVAL_MS), windowRefocus$).pipe(
      exhaustMap(() =>
        forkJoin({
          status: pullMidnightSyncStatus(ref),
          state: pullMidnightState(ref),
        }).pipe(
          catchError((error: unknown) => {
            logger.error(error);
            return EMPTY;
          }),
        ),
      ),
      share(),
    );

    // On a reload / SW death / warm-key expiry the host has no live session, so
    // `getState` serves the STALE vault-public projection and the pull-only poll
    // never restarts sync. Poke the host to re-mount the unlock prompt (ADR
    // 34/47) — throttled, never per tick, which ADR 47 warns cold-mounts the
    // prompt over unrelated ceremonies. The throttle window is what makes the
    // poke RECOVERABLE: a dismissed unlock surface leaves the engine cold, and a
    // one-shot-per-cold-episode latch would then freeze the cold projection for
    // the rest of the session. The host coalesces a repeat poke onto the unlock
    // ceremony already pending for the account, so a re-poke never stacks a
    // second surface.
    const coldRestart$ = pulls$.pipe(
      filter(
        ({ status, state }) =>
          status.ok &&
          !status.value.engineLive &&
          // Only (re)start sync for a wallet that actually has Midnight state —
          // a non-Midnight InMemory wallet has no vault-public projection
          // (`getState` is null) and the host would refuse requestSync.
          state.ok &&
          state.value != null,
      ),
      throttleTime(COLD_RESTART_RETRY_INTERVAL_MS),
      exhaustMap(() => requestMidnightSync(ref).pipe(catchError(() => EMPTY))),
      ignoreElements(),
    );

    const dispatched$ = pulls$.pipe(
      // Restore the steady-state quiescence the fixed-interval poll lost (the
      // monolith drove this off the quiet-at-steady-state `wallet.syncProgress$`):
      // skip ticks whose host snapshot is unchanged. Otherwise a synced account
      // re-runs the add/complete pair every interval — `completeSyncOperation`
      // clears `pendingSync`, so the next `!existing` tick re-adds — rewriting
      // `lastSuccessfulSync` and thrashing redux-persist.
      distinctUntilChanged(sameHostPull()),
      withLatestFrom(
        isUnshieldedEnabled$,
        stateObservables.sync.selectSyncStatusByAccount$,
      ),
      mergeMap(
        ([{ status, state }, isUnshieldedEnabled, syncStatusByAccount]) => {
          const emitted: MidnightAction[] = [];
          // A live engine ⇒ `getState` returned a live facade snapshot (real
          // balances); a cold engine ⇒ the vault-public projection with EMPTY
          // balances. Gate the balance-bearing dispatches on it so a cold tick
          // keeps the last-known assets (addresses/publics still refresh). Default
          // to NOT live when the status read failed — never wipe on uncertainty.
          const isEngineLive = status.ok && status.value.engineLive;
          // The state half reifies the rich snapshot through value-object codecs
          // and `BigInt` conversions, so a single malformed field throws. This
          // pipe has NO upstream `catchError` — an escaped throw errors the
          // whole side effect (`exhaustMap`→`mergeMap`→`switchMap`), tearing the
          // watch down for EVERY Midnight account until the app reloads, each
          // then frozen at its last dispatch. A completed account so frozen
          // stays pinned to its stale `lastSuccessfulSync` "Synced" pill while
          // the engine reports it mid-sync. Contain the state half so a bad
          // snapshot skips only THIS tick's balances/tokens (the next good one
          // recovers them) and, above all, never blocks the sync half below —
          // the display-critical `synced` flag that flips the pill back to
          // "Syncing" when the host resumes a sync.
          if (state.ok && state.value) {
            try {
              emitted.push(
                ...buildStateActions({
                  accountId,
                  network,
                  snapshot: state.value,
                  isUnshieldedEnabled,
                  actions,
                  includeBalances: isEngineLive,
                }),
              );
            } catch {
              // Skip this tick's state dispatches; keep polling + the sync half.
            }
          }
          if (status.ok) {
            emitted.push(
              ...buildSyncActions({
                accountId,
                status: status.value,
                isUnshieldedEnabled,
                syncStatusByAccount,
                actions,
              }),
            );
          }
          return from(emitted);
        },
      ),
    );

    return merge(coldRestart$, dispatched$);
  };

// The wallet types whose Midnight leg is polled: the two the host projects as
// seed-bearing shells (cardano-host-pull wallet-repo-hydrator). LazyInMemory
// carries the SAME Midnight public material as InMemory and is READ-ONLY — Lace
// persists no seed for it, so no host ceremony can unseal it — which costs this
// loop nothing: it reads through `getSyncStatus`/`getState` and the one
// prompt-capable call it makes (`requestMidnightSync`, on a cold engine) is
// already gated on the host actually holding Midnight material for the wallet.
// Signing stays refused elsewhere (the host's `requestSend` admits InMemory
// only), so watching a lazy wallet syncs it without offering a signature Lace
// cannot produce. Omitting a type here leaves such a wallet permanently
// unsynced with no error anywhere.
const WATCHED_WALLET_TYPES: readonly string[] = [
  WalletType.InMemory,
  WalletType.LazyInMemory,
];

const isWatched = (wallet: AnyWallet): boolean =>
  WATCHED_WALLET_TYPES.includes(wallet.type);

/**
 * Watch every WATCHED_WALLET_TYPES wallet on the active Midnight network.
 * Restarts all polls on a network switch (`switchMap`), starts a fresh poll per
 * newly-appearing wallet (`groupBy` + `exhaustMap`) and tears it down when the
 * wallet leaves the repo (`takeUntil`). `whileActive` sits at the END of the pipe
 * so a lock tears the whole chain down (ADR 25), stopping the intervals +
 * in-flight host calls.
 */
export const watchMidnightWallets: SideEffect = (
  actionObservables,
  stateObservables,
  dependencies,
) => {
  const isUnshieldedEnabled$ =
    stateObservables.features.selectLoadedFeatures$.pipe(
      map(loaded =>
        loaded.featureFlags.some(
          flag => flag.key === FEATURE_FLAG_MIDNIGHT_UNSHIELDED,
        ),
      ),
      distinctUntilChanged(),
    );

  return stateObservables.midnightContext.selectNetworkId$.pipe(
    distinctUntilChanged(),
    switchMap(network => {
      const wallets$ = stateObservables.wallets.selectAll$.pipe(
        map(wallets => wallets.filter(isWatched)),
        share(),
      );
      return wallets$.pipe(
        mergeAll(),
        groupBy(wallet => wallet.walletId),
        mergeMap(group$ =>
          group$.pipe(
            exhaustMap(wallet =>
              pollMidnightWallet(
                wallet.walletId,
                network,
                isUnshieldedEnabled$,
              )(actionObservables, stateObservables, dependencies).pipe(
                takeUntil(
                  wallets$.pipe(
                    filter(
                      current =>
                        !current.some(w => w.walletId === wallet.walletId),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }),
    whileActive(dependencies.isWalletActive$),
  );
};
