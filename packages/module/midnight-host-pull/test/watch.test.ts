import { Percent } from '@cardano-sdk/util';
import { MidnightAccountId } from '@lace-contract/midnight-context';
import { WalletId, WalletType } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  COLD_RESTART_RETRY_INTERVAL_MS,
  midnightSyncOperationId,
} from '../src/const';
import { watchMidnightWallets } from '../src/store/side-effects/watch';

import {
  NETWORK_ID,
  stateSnapshot,
  syncStatusCold,
  syncStatusComplete,
  syncStatusInProgress,
} from './fixtures';

import type { ActionCreators } from '../src';
import type { MidnightAccountRef } from '../src/lace-client';
import type { SyncSliceState } from '@lace-contract/sync';
import type { AnyWallet } from '@lace-contract/wallet-repo';
import type {
  LaceResult,
  MidnightStateSnapshot,
  MidnightSyncStatus,
} from '@lace-lib/extension-shell-api';
import type { RunHelpers } from 'rxjs/testing';
import type { Logger } from 'ts-log';

// The poll pulls state + status through INJECTED dependencies (ADR 19), never
// `window.lace` inline — the `pullMidnight*` stubs stand in for the host reads.
// The periodic pull uses only those two (never `requestSync`), so a background
// tick never mounts the host unlock prompt (ADR 34, D5/D8). `requestMidnightSync`
// (the one prompt-capable read) is injected too but fired ONLY — and at most once
// per retry interval — when the engine is observed cold for a Midnight wallet.

// A passthrough action creator set: every dispatched action is `{ type, payload }`
// so the test can assert the SHAPES the poller emits without the RTK slices (the
// dispatched actions belong to other contracts, not this module).
const tag = (type: string) => (payload: unknown) => ({ type, payload });
const actions = {
  addresses: { upsertAddresses: tag('addresses/upsertAddresses') },
  tokens: {
    setAddressTokens: tag('tokens/setAddressTokens'),
    upsertTokensMetadata: tag('tokens/upsertTokensMetadata'),
  },
  midnightContext: {
    setDustBalance: tag('midnightContext/setDustBalance'),
    setDustGenerationDetails: tag('midnightContext/setDustGenerationDetails'),
    setPublicKeys: tag('midnightContext/setPublicKeys'),
  },
  sync: {
    addSyncOperation: tag('sync/addSyncOperation'),
    updateSyncProgress: tag('sync/updateSyncProgress'),
    completeSyncOperation: tag('sync/completeSyncOperation'),
    failSyncOperation: tag('sync/failSyncOperation'),
  },
  activities: { upsertActivities: tag('activities/upsertActivities') },
} as unknown as Partial<ActionCreators>;

const wallet = {
  walletId: 'w1',
  type: WalletType.InMemory,
  accounts: [],
} as unknown as AnyWallet;

// Lace persists no seed for a LazyInMemory wallet, so it never signs — but its
// Midnight public material is an InMemory wallet's, and the poll only reads.
const lazyWallet = {
  walletId: 'w1',
  type: WalletType.LazyInMemory,
  accounts: [],
} as unknown as AnyWallet;

// A host-paired device wallet: projected to the guest for reads, but it holds no
// Midnight material at all, so its Midnight leg must stay unwatched.
const hardwareWallet = {
  walletId: 'w1',
  type: WalletType.HardwareLedger,
  accounts: [],
} as unknown as AnyWallet;

const ref: MidnightAccountRef = {
  walletId: 'w1',
  accountIndex: 0,
  network: NETWORK_ID,
};

const accountId = MidnightAccountId(WalletId('w1'), 0, NETWORK_ID);
const operationId = midnightSyncOperationId(accountId);

const statusResult = (
  value: MidnightSyncStatus,
): LaceResult<MidnightSyncStatus> => ({ ok: true, value });

const statusFailure = (): LaceResult<MidnightSyncStatus> => ({
  ok: false,
  error: { code: 'internal', message: 'method failed' },
});

const stateResult = (
  value: MidnightStateSnapshot | null,
): LaceResult<MidnightStateSnapshot | null> => ({ ok: true, value });

const syncRequestResult = (): LaceResult<{ syncId: string }> => ({
  ok: true,
  value: { syncId: 's1' },
});

// Cold observables must be built inside the scheduler run, so the shared state
// slice is a factory over the `cold` helper.
const buildStateObservables = (cold: RunHelpers['cold']) => ({
  midnightContext: { selectNetworkId$: cold('a', { a: NETWORK_ID }) },
  wallets: { selectAll$: cold('a', { a: [wallet] }) },
  features: {
    selectLoadedFeatures$: cold('a', { a: { modules: [], featureFlags: [] } }),
  },
  sync: { selectSyncStatusByAccount$: cold('a', { a: {} }) },
});

describe('watchMidnightWallets', () => {
  it('pulls state + status and dispatches the watch-parity actions on a poll tick WITHOUT prompting (no requestSync)', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const emitted: Array<{ type: string }> = [];
      const pullMidnightSyncStatus = vi.fn((_ref: MidnightAccountRef) =>
        cold('(a|)', { a: statusResult(syncStatusInProgress) }),
      );
      const pullMidnightState = vi.fn((_ref: MidnightAccountRef) =>
        cold('(a|)', { a: stateResult(stateSnapshot) }),
      );

      return {
        stateObservables: buildStateObservables(cold),
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          // true, then false-and-complete after the single tick so `flush()`
          // terminates — the poll's `timer` is otherwise infinite; the false
          // tears the whole chain down (whileActive, ADR 25).
          isWalletActive$: cold('a 4999ms (b|)', { a: true, b: false }),
          pullMidnightSyncStatus,
          pullMidnightState,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action =>
            emitted.push(action as { type: string }),
          );
          flush();

          // The tick reads via the two injected pull reads only, keyed off the
          // wallet's index-0 account ref.
          expect(pullMidnightSyncStatus).toHaveBeenCalledWith(ref);
          expect(pullMidnightState).toHaveBeenCalledWith(ref);

          const types = emitted.map(action => action.type);
          // State half (unshielded off → one setAddressTokens for the shielded address).
          expect(types).toContain('addresses/upsertAddresses');
          expect(
            types.filter(t => t === 'tokens/setAddressTokens'),
          ).toHaveLength(1);
          expect(types).toContain('tokens/upsertTokensMetadata');
          expect(types).toContain('midnightContext/setDustBalance');
          expect(types).toContain('midnightContext/setDustGenerationDetails');
          expect(types).toContain('midnightContext/setPublicKeys');
          expect(types).toContain('activities/upsertActivities');
          // Sync half: no existing operation → add (not update), still in progress.
          expect(types).toContain('sync/addSyncOperation');
          expect(types).not.toContain('sync/completeSyncOperation');
        },
      };
    });
  });

  it('does not re-run the sync add/complete pair for a steady, fully-synced account across multiple poll ticks', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const emitted: Array<{ type: string }> = [];

      return {
        stateObservables: buildStateObservables(cold),
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          // Four ticks (t=0, 10s, 20s, 30s), torn down after the last one — the
          // host snapshot is identical each time.
          isWalletActive$: cold('a 34999ms (b|)', { a: true, b: false }),
          pullMidnightSyncStatus: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: statusResult(syncStatusComplete) }),
          pullMidnightState: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: stateResult(stateSnapshot) }),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action =>
            emitted.push(action as { type: string }),
          );
          flush();

          const types = emitted.map(action => action.type);
          // The operation is added and completed exactly once, not once per tick
          // — the identical snapshots are deduped, so a per-tick complete never
          // rewrites lastSuccessfulSync and thrashes redux-persist.
          expect(types.filter(t => t === 'sync/addSyncOperation')).toHaveLength(
            1,
          );
          expect(
            types.filter(t => t === 'sync/completeSyncOperation'),
          ).toHaveLength(1);
        },
      };
    });
  });

  it('re-runs the sync actions when the polled status changes mid-stream', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const emitted: Array<{ type: string }> = [];
      // t=0 complete, t=10s complete (deduped as unchanged), t=20s in-progress.
      const statuses = [
        syncStatusComplete,
        syncStatusComplete,
        syncStatusInProgress,
      ];
      let call = 0;

      return {
        stateObservables: buildStateObservables(cold),
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          // Three ticks (t=0, 10s, 20s), torn down after the last one.
          isWalletActive$: cold('a 24999ms (b|)', { a: true, b: false }),
          pullMidnightSyncStatus: (_ref: MidnightAccountRef) =>
            cold('(a|)', {
              a: statusResult(statuses[call++] ?? syncStatusInProgress),
            }),
          pullMidnightState: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: stateResult(stateSnapshot) }),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action =>
            emitted.push(action as { type: string }),
          );
          flush();

          const types = emitted.map(action => action.type);
          // Tick 1 (complete) and tick 3 (in-progress) each add an operation;
          // tick 2 is the deduped repeat and adds nothing.
          expect(types.filter(t => t === 'sync/addSyncOperation')).toHaveLength(
            2,
          );
          // Only the completed status completes the operation.
          expect(
            types.filter(t => t === 'sync/completeSyncOperation'),
          ).toHaveLength(1);
        },
      };
    });
  });

  it('updates progress (not re-adds) when an operation is already in progress for the account', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const emitted: Array<{ type: string }> = [];
      // The account already carries an in-progress operation, so a fresh
      // in-progress tick updates its progress rather than re-adding it.
      const syncStatusByAccount: SyncSliceState['syncStatusByAccount'] = {};
      syncStatusByAccount[accountId] = {
        pendingSync: {
          startedAt: Timestamp(0),
          operations: {
            [operationId]: {
              operationId,
              status: 'InProgress',
              type: 'Determinate',
              progress: Percent(0.3),
              description: 'sync.operation.midnight-wallet-sync',
              startedAt: Timestamp(0),
            },
          },
        },
      };

      return {
        stateObservables: {
          midnightContext: { selectNetworkId$: cold('a', { a: NETWORK_ID }) },
          wallets: { selectAll$: cold('a', { a: [wallet] }) },
          features: {
            selectLoadedFeatures$: cold('a', {
              a: { modules: [], featureFlags: [] },
            }),
          },
          sync: {
            selectSyncStatusByAccount$: cold('a', { a: syncStatusByAccount }),
          },
        },
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          isWalletActive$: cold('a 4999ms (b|)', { a: true, b: false }),
          pullMidnightSyncStatus: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: statusResult(syncStatusInProgress) }),
          pullMidnightState: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: stateResult(stateSnapshot) }),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action =>
            emitted.push(action as { type: string }),
          );
          flush();

          const types = emitted.map(action => action.type);
          expect(types).toContain('sync/updateSyncProgress');
          expect(types).not.toContain('sync/addSyncOperation');
          expect(types).not.toContain('sync/completeSyncOperation');
        },
      };
    });
  });

  it('dispatches no sync actions but pokes requestSync ONCE when the engine is cold for a Midnight wallet', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const emitted: Array<{ type: string }> = [];
      const requestMidnightSync = vi.fn((_ref: MidnightAccountRef) =>
        cold('(a|)', { a: syncRequestResult() }),
      );

      return {
        stateObservables: buildStateObservables(cold),
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          // Four ticks (t=0, 10s, 20s, 30s) all reporting the SAME cold status.
          isWalletActive$: cold('a 34999ms (b|)', { a: true, b: false }),
          // A cold engine reports no progress → computeSyncPlan yields no plan,
          // so the sync half emits nothing; the state half still runs.
          pullMidnightSyncStatus: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: statusResult(syncStatusCold) }),
          pullMidnightState: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: stateResult(stateSnapshot) }),
          requestMidnightSync,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action =>
            emitted.push(action as { type: string }),
          );
          flush();

          const types = emitted.map(action => action.type);
          expect(types).toContain('addresses/upsertAddresses');
          expect(types.some(t => t.startsWith('sync/'))).toBe(false);
          // The cold engine (getState still projects the Midnight publics) pokes
          // requestSync to restart sync + re-mount the prompt — ONCE across all
          // four identical cold ticks, never per tick (ADR 47).
          expect(requestMidnightSync).toHaveBeenCalledWith(ref);
          expect(requestMidnightSync).toHaveBeenCalledTimes(1);
        },
      };
    });
  });

  it('re-pokes requestSync once the retry interval elapses on an engine left cold', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const requestMidnightSync = vi.fn((_ref: MidnightAccountRef) =>
        cold('(a|)', { a: syncRequestResult() }),
      );

      return {
        stateObservables: buildStateObservables(cold),
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          // Cold for the whole run, torn down just past the retry interval.
          isWalletActive$: cold(`a ${COLD_RESTART_RETRY_INTERVAL_MS}ms (b|)`, {
            a: true,
            b: false,
          }),
          pullMidnightSyncStatus: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: statusResult(syncStatusCold) }),
          pullMidnightState: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: stateResult(stateSnapshot) }),
          requestMidnightSync,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();

          // The user dismissed the unlock surface the first poke mounted, so the
          // engine never came back live. The poke retries once the interval is
          // up instead of latching for the rest of the session — twice over the
          // ~30 cold ticks in between, not once per tick.
          expect(requestMidnightSync).toHaveBeenCalledTimes(2);
        },
      };
    });
  });

  it('re-pokes requestSync on the first cold tick after a live episode', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const requestMidnightSync = vi.fn((_ref: MidnightAccountRef) =>
        cold('(a|)', { a: syncRequestResult() }),
      );
      // A long live episode (the user unlocked) outlasts the retry interval, so
      // the warm-key expiry that follows pokes immediately rather than waiting.
      const liveTicks = COLD_RESTART_RETRY_INTERVAL_MS / 10_000;
      let call = 0;

      return {
        stateObservables: buildStateObservables(cold),
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          isWalletActive$: cold(
            `a ${COLD_RESTART_RETRY_INTERVAL_MS + 10_000}ms (b|)`,
            { a: true, b: false },
          ),
          pullMidnightSyncStatus: (_ref: MidnightAccountRef) =>
            cold('(a|)', {
              a: statusResult(
                call++ > liveTicks ? syncStatusCold : syncStatusComplete,
              ),
            }),
          pullMidnightState: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: stateResult(stateSnapshot) }),
          requestMidnightSync,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();

          expect(requestMidnightSync).toHaveBeenCalledTimes(1);
        },
      };
    });
  });

  it('fails the pending sync operation when the engine goes cold mid-sync', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const emitted: Array<{ type: string }> = [];
      // An operation added by an earlier live tick. A cold engine reports no
      // progress, so nothing else would ever move it out of `pendingSync` —
      // `selectIsAccountSyncing` would spin for the rest of the session.
      const syncStatusByAccount: SyncSliceState['syncStatusByAccount'] = {
        [accountId]: {
          pendingSync: {
            startedAt: Timestamp(0),
            operations: {
              [operationId]: {
                operationId,
                status: 'InProgress',
                type: 'Determinate',
                progress: Percent(0.3),
                description: 'sync.operation.midnight-wallet-sync',
                startedAt: Timestamp(0),
              },
            },
          },
        },
      };

      return {
        stateObservables: {
          ...buildStateObservables(cold),
          sync: {
            selectSyncStatusByAccount$: cold('a', { a: syncStatusByAccount }),
          },
        },
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          isWalletActive$: cold('a 4999ms (b|)', { a: true, b: false }),
          pullMidnightSyncStatus: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: statusResult(syncStatusCold) }),
          pullMidnightState: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: stateResult(stateSnapshot) }),
          requestMidnightSync: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: syncRequestResult() }),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action =>
            emitted.push(action as { type: string }),
          );
          flush();

          const types = emitted.map(action => action.type);
          expect(types).toContain('sync/failSyncOperation');
          expect(types).not.toContain('sync/addSyncOperation');
          expect(types).not.toContain('sync/completeSyncOperation');
        },
      };
    });
  });

  it('dispatches nothing and never pokes when the status read itself fails', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const emitted: Array<{ type: string }> = [];
      const requestMidnightSync = vi.fn((_ref: MidnightAccountRef) =>
        cold('(a|)', { a: syncRequestResult() }),
      );

      return {
        stateObservables: buildStateObservables(cold),
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          isWalletActive$: cold('a 4999ms (b|)', { a: true, b: false }),
          pullMidnightSyncStatus: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: statusFailure() }),
          pullMidnightState: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: stateResult(stateSnapshot) }),
          requestMidnightSync,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action =>
            emitted.push(action as { type: string }),
          );
          flush();

          const types = emitted.map(action => action.type);
          // No sync half at all (the status is unknown) and no balance-bearing
          // dispatch — an unread status is never treated as a live engine.
          expect(types.some(t => t.startsWith('sync/'))).toBe(false);
          expect(types).not.toContain('tokens/setAddressTokens');
          expect(types).toContain('addresses/upsertAddresses');
          // An unknown status is not a cold engine, so it never prompts.
          expect(requestMidnightSync).not.toHaveBeenCalled();
        },
      };
    });
  });

  it('does NOT poke requestSync for a cold engine with no Midnight state (non-Midnight wallet)', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const emitted: Array<{ type: string }> = [];
      const requestMidnightSync = vi.fn((_ref: MidnightAccountRef) =>
        cold('(a|)', { a: syncRequestResult() }),
      );

      return {
        stateObservables: buildStateObservables(cold),
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          isWalletActive$: cold('a 4999ms (b|)', { a: true, b: false }),
          pullMidnightSyncStatus: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: statusResult(syncStatusCold) }),
          // A non-Midnight InMemory wallet has no vault-public projection.
          pullMidnightState: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: stateResult(null) }),
          requestMidnightSync,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action =>
            emitted.push(action as { type: string }),
          );
          flush();

          expect(requestMidnightSync).not.toHaveBeenCalled();
        },
      };
    });
  });

  it('keeps dispatching the sync operation (and does not tear the watch down) when the state snapshot is malformed', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const emitted: Array<{ type: string }> = [];
      let didError = false;
      // A dust balance that is not a decimal integer makes the state half throw
      // (`BigInt('nope')`). The sync half must still run — otherwise the account
      // stays pinned to its stale `lastSuccessfulSync` "Synced" pill while the
      // host reports it mid-sync — and the throw must not kill the whole watch.
      const malformedSnapshot = {
        ...stateSnapshot,
        dust: { ...stateSnapshot.dust, balance: 'nope' },
      };
      // Two DISTINCT statuses so `distinctUntilChanged` does not dedupe the
      // second tick — proving the watch survives the first tick's throw and
      // keeps polling.
      const statuses = [syncStatusInProgress, syncStatusComplete];
      let call = 0;

      return {
        stateObservables: buildStateObservables(cold),
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          // Two ticks (t=0, 10s), torn down after the last one.
          isWalletActive$: cold('a 14999ms (b|)', { a: true, b: false }),
          pullMidnightSyncStatus: (_ref: MidnightAccountRef) =>
            cold('(a|)', {
              a: statusResult(statuses[call++] ?? syncStatusComplete),
            }),
          pullMidnightState: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: stateResult(malformedSnapshot) }),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe({
            next: action => emitted.push(action as { type: string }),
            error: () => {
              didError = true;
            },
          });
          flush();

          const types = emitted.map(action => action.type);
          // The state half threw on every tick, so none of its dispatches land …
          expect(types).not.toContain('addresses/upsertAddresses');
          // … but the sync half still reflected the `synced` flag on BOTH ticks
          // (the throw neither blocked it nor tore the watch down).
          expect(types.filter(t => t === 'sync/addSyncOperation')).toHaveLength(
            2,
          );
          expect(types).toContain('sync/completeSyncOperation');
          expect(didError).toBe(false);
        },
      };
    });
  });

  it('keeps polling after a REJECTED host pull — one bad round-trip costs a tick, not the watch', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const emitted: Array<{ type: string }> = [];
      let didError = false;
      const logger = { error: vi.fn() } as unknown as Logger;
      // The pull itself rejects (a torn-down host bridge) — upstream of the
      // malformed-snapshot guard above, so only this leg's own catch survives it.
      let call = 0;

      return {
        stateObservables: buildStateObservables(cold),
        dependencies: {
          actions,
          logger,
          windowRefocus$: NEVER,
          // Two ticks (t=0, 10s), torn down after the last one.
          isWalletActive$: cold('a 14999ms (b|)', { a: true, b: false }),
          pullMidnightSyncStatus: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: statusResult(syncStatusInProgress) }),
          pullMidnightState: (_ref: MidnightAccountRef) =>
            call++ === 0
              ? cold<LaceResult<MidnightStateSnapshot | null>>(
                  '#',
                  {},
                  new Error('the wallet service is unreachable'),
                )
              : cold('(a|)', { a: stateResult(stateSnapshot) }),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe({
            next: action => emitted.push(action as { type: string }),
            error: () => {
              didError = true;
            },
          });
          flush();

          // The rejected tick dispatched nothing and was logged …
          expect(logger.error).toHaveBeenCalledTimes(1);
          // … and the NEXT tick still ran, so the watch outlived the rejection.
          expect(emitted.map(action => action.type)).toContain(
            'addresses/upsertAddresses',
          );
          expect(didError).toBe(false);
        },
      };
    });
  });

  it('tears the poll down when the wallet leaves the repo', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const emitted: Array<{ type: string }> = [];

      return {
        stateObservables: {
          midnightContext: { selectNetworkId$: cold('a', { a: NETWORK_ID }) },
          // The wallet is present on the first tick, then leaves the repo before
          // the second poll interval — the takeUntil notifier fires and no
          // further tick runs.
          wallets: {
            selectAll$: cold('a 999ms b', { a: [wallet], b: [] }),
          },
          features: {
            selectLoadedFeatures$: cold('a', {
              a: { modules: [], featureFlags: [] },
            }),
          },
          sync: { selectSyncStatusByAccount$: cold('a', { a: {} }) },
        },
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          isWalletActive$: cold('a 19999ms (b|)', { a: true, b: false }),
          pullMidnightSyncStatus: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: statusResult(syncStatusInProgress) }),
          pullMidnightState: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: stateResult(stateSnapshot) }),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action =>
            emitted.push(action as { type: string }),
          );
          flush();

          const types = emitted.map(action => action.type);
          // Only the first tick (t=0) ran; the wallet left at t=1s, so the
          // t=10s tick never fired — exactly one state dispatch, not two.
          expect(
            types.filter(t => t === 'addresses/upsertAddresses'),
          ).toHaveLength(1);
        },
      };
    });
  });

  it('re-pulls IMMEDIATELY when the guest regains focus, not only on the next interval tick', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const pullMidnightSyncStatus = vi.fn((_ref: MidnightAccountRef) =>
        cold('(a|)', { a: statusResult(syncStatusInProgress) }),
      );
      const pullMidnightState = vi.fn((_ref: MidnightAccountRef) =>
        cold('(a|)', { a: stateResult(stateSnapshot) }),
      );

      return {
        stateObservables: buildStateObservables(cold),
        dependencies: {
          actions,
          // Torn down at t=5s → the fixed 10s poll fires only its t=0 tick, so an
          // extra pull can ONLY come from the refocus (proving the immediate
          // re-pull, not the interval).
          isWalletActive$: cold('a 4999ms (b|)', { a: true, b: false }),
          pullMidnightSyncStatus,
          pullMidnightState,
          // The host handed focus back at t=3s (its unlock window closed) —
          // injected directly (no debounce; buildWindowRefocus$ is unit-covered).
          windowRefocus$: cold('2999ms a', { a: undefined }),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          // The t=0 interval tick + the t=3s refocus = two pulls before t=10s.
          expect(pullMidnightState).toHaveBeenCalledTimes(2);
          expect(pullMidnightSyncStatus).toHaveBeenCalledTimes(2);
        },
      };
    });
  });

  it('keeps the last balances (skips the wiping empty upserts) while the engine is cold', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const emitted: Array<{ type: string }> = [];

      return {
        stateObservables: buildStateObservables(cold),
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          isWalletActive$: cold('a 4999ms (b|)', { a: true, b: false }),
          // A cold engine — getState still projects the account's publics, but a
          // real cold projection carries EMPTY balances (the fixture snapshot
          // stands in; the `engineLive:false` flag is what gates the balances).
          pullMidnightSyncStatus: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: statusResult(syncStatusCold) }),
          pullMidnightState: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: stateResult(stateSnapshot) }),
          requestMidnightSync: (_ref: MidnightAccountRef) =>
            cold('(a|)', { a: syncRequestResult() }),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action =>
            emitted.push(action as { type: string }),
          );
          flush();

          const types = emitted.map(action => action.type);
          // Addresses + public keys still refresh from the cold projection …
          expect(types).toContain('addresses/upsertAddresses');
          expect(types).toContain('midnightContext/setPublicKeys');
          // … but the balance-bearing upserts are SKIPPED so a cold tick never
          // wipes the last-known assets (an empty setAddressTokens deletes the
          // address's token entry). They return on the first live tick.
          expect(types).not.toContain('tokens/setAddressTokens');
          expect(types).not.toContain('tokens/upsertTokensMetadata');
          expect(types).not.toContain('midnightContext/setDustBalance');
          expect(types).not.toContain(
            'midnightContext/setDustGenerationDetails',
          );
          expect(types).not.toContain('activities/upsertActivities');
        },
      };
    });
  });

  it('watches a LazyInMemory wallet — the same Midnight leg as an InMemory one', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const emitted: Array<{ type: string }> = [];
      const pullMidnightSyncStatus = vi.fn((_ref: MidnightAccountRef) =>
        cold('(a|)', { a: statusResult(syncStatusInProgress) }),
      );
      const pullMidnightState = vi.fn((_ref: MidnightAccountRef) =>
        cold('(a|)', { a: stateResult(stateSnapshot) }),
      );

      return {
        stateObservables: {
          ...buildStateObservables(cold),
          wallets: { selectAll$: cold('a', { a: [lazyWallet] }) },
        },
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          isWalletActive$: cold('a 4999ms (b|)', { a: true, b: false }),
          pullMidnightSyncStatus,
          pullMidnightState,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action =>
            emitted.push(action as { type: string }),
          );
          flush();

          expect(pullMidnightSyncStatus).toHaveBeenCalledWith(ref);
          expect(pullMidnightState).toHaveBeenCalledWith(ref);
          const types = emitted.map(action => action.type);
          expect(types).toContain('addresses/upsertAddresses');
          expect(types).toContain('midnightContext/setPublicKeys');
          expect(types).toContain('sync/addSyncOperation');
        },
      };
    });
  });

  it('leaves a host-paired hardware wallet unwatched — it carries no Midnight material', () => {
    testSideEffect(watchMidnightWallets, ({ cold, flush }) => {
      const pullMidnightSyncStatus = vi.fn((_ref: MidnightAccountRef) =>
        cold('(a|)', { a: statusResult(syncStatusInProgress) }),
      );
      const pullMidnightState = vi.fn((_ref: MidnightAccountRef) =>
        cold('(a|)', { a: stateResult(stateSnapshot) }),
      );

      return {
        stateObservables: {
          ...buildStateObservables(cold),
          wallets: { selectAll$: cold('a', { a: [hardwareWallet] }) },
        },
        dependencies: {
          actions,
          windowRefocus$: NEVER,
          isWalletActive$: cold('a 4999ms (b|)', { a: true, b: false }),
          pullMidnightSyncStatus,
          pullMidnightState,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();

          expect(pullMidnightSyncStatus).not.toHaveBeenCalled();
          expect(pullMidnightState).not.toHaveBeenCalled();
        },
      };
    });
  });
});
