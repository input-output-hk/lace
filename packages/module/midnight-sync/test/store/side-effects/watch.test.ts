import { randomBytes } from 'node:crypto';

import { Percent } from '@cardano-sdk/util';
import { addressesActions } from '@lace-contract/addresses';
import { failuresActions } from '@lace-contract/failures';
import {
  createInitialMidnightTokenMetadata,
  createMidnightToken,
  type MidnightAccountProps,
  midnightContextActions,
  MidnightSDKNetworkIds,
  midnightWalletsForRuntime,
} from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import {
  computeAccountSyncingProgress,
  computeAccountSyncStatusDetail,
  selectGlobalSyncStatus,
  syncActions,
} from '@lace-contract/sync';
import { syncReducers } from '@lace-contract/sync/src/store/slice';
import { TokenId, tokensActions } from '@lace-contract/tokens';
import { BigNumber, HexBytes, Timestamp } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { createKeystore } from '@midnightntwrk/wallet-sdk/unshielded';
import { NetworkId } from '@midnightntwrk/wallet-sdk-abstractions';
import {
  BehaviorSubject,
  delay,
  map,
  Subject,
  NEVER,
  Observable,
  of,
  throwError,
} from 'rxjs';
import { dummyLogger } from 'ts-log';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { midnightSyncActions } from '../../../src/store/actions';
import {
  updateDustBalance,
  updateDustGenerationDetails,
  updateSetPublicKeys,
  updateSyncProgress,
  updateTokens,
  upsertAddresses,
  watchMidnightAccount,
  watchMidnightAccounts,
} from '../../../src/store/side-effects/watch';
import { MidnightSyncFailureId } from '../../../src/value-objects/midnight-sync-failure-id.vo';

import type {
  ActionCreators,
  Selectors,
  SideEffect,
} from '../../../src/context';
import type {
  MidnightNetworkConfig,
  SerializedMidnightWallet,
} from '@lace-contract/midnight-context';
import type {
  CoinsByTokenType,
  MidnightWallet,
  MidnightWalletAddress,
  MidnightWalletsByAccountId,
} from '@lace-contract/midnight-context';
import type { CollectionStorage } from '@lace-contract/storage';
import type { AccountSyncStatus, SyncSliceState } from '@lace-contract/sync';
import type { MetadataByTokenId } from '@lace-contract/tokens';
import type {
  AccountId,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { FacadeState } from '@midnightntwrk/wallet-sdk/facade';
import type { ObservedValueOf } from 'rxjs';
import type { RunHelpers } from 'rxjs/testing';

// The wallet's coinsByTokenType$ emits this structure (not exported from midnight-context)
type ObservableMidnightWalletCoinsByTokenType = {
  shielded: CoinsByTokenType;
  unshielded: CoinsByTokenType;
};

type SyncProgress = ObservedValueOf<MidnightWallet['syncProgress$']>;

const {
  accountId,
  walletId,
  midnightShieldedAddress,
  midnightUnshieldedAddress,
  midnightDustAddress,
} = stubData;
const networkId = MidnightSDKNetworkIds.Preview;
// The registry watchMidnightAccount hands to the per-wallet effects.
const midnightWallets$ = new BehaviorSubject<MidnightWalletsByAccountId>({});

const actions = {
  ...addressesActions,
  ...failuresActions,
  ...midnightContextActions,
  ...midnightSyncActions,
  ...syncActions,
  ...tokensActions,
};

const createMockMidnightWallet = (
  cold: RunHelpers['cold'],
  overrides: Partial<MidnightWallet>,
): MidnightWallet => ({
  accountId,
  networkId,
  nightVerifyingKey: createKeystore(
    { kind: 'schnorr', secret: randomBytes(32) },
    networkId,
  ).getPublicKey(),
  proofCircuitProvider: {
    check: async () => [],
    prove: async () => new Uint8Array(),
  },
  walletId,
  address$: cold(''),
  areKeysAvailable$: cold(''),
  coinsByTokenType$: cold(''),
  syncProgress$: cold(''),
  transactionHistory$: cold(''),
  adoptTransaction: () => cold(''),
  balanceFinalizedTransaction: () => cold(''),
  balanceUnboundTransaction: () => cold(''),
  balanceUnprovenTransaction: () => cold(''),
  calculateTransactionFee: () => cold(''),
  estimateTransactionFee: () => cold(''),
  deregisterFromDustGeneration: () => cold(''),
  getTransactionHistoryEntryByHash: () => cold(''),
  finalizeRecipe: () => cold(''),
  finalizeTransaction: () => cold(''),
  registerNightUtxosForDustGeneration: () => cold(''),
  revert: () => cold(''),
  initSwap: () => cold(''),
  state: () => cold(''),
  stop: () => cold(''),
  signRecipe: () => cold(''),
  signData: () => cold(''),
  signUnprovenTransaction: () => cold(''),
  submitTransaction: () => cold(''),
  transferTransaction: () => cold(''),
  ...overrides,
});

describe('upsertAddresses', () => {
  it('emits upsertAddresses with shielded and dust when unshielded feature flag is disabled', () => {
    const address: MidnightWalletAddress = {
      shielded: midnightShieldedAddress,
      unshielded: midnightUnshieldedAddress,
      dust: midnightDustAddress,
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            address$: cold('a', { a: address }),
          });
          return upsertAddresses(wallet, cold('a', { a: false }));
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.addresses.upsertAddresses({
                blockchainName: 'Midnight',
                accountId,
                addresses: [
                  { address: address.shielded },
                  { address: address.dust },
                ],
              }),
            });
          },
        };
      },
    );
  });

  it('emits upsertAddresses including unshielded when feature flag is enabled', () => {
    const address: MidnightWalletAddress = {
      shielded: midnightShieldedAddress,
      unshielded: midnightUnshieldedAddress,
      dust: midnightDustAddress,
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            address$: cold('a', { a: address }),
          });
          return upsertAddresses(wallet, cold('a', { a: true }));
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.addresses.upsertAddresses({
                blockchainName: 'Midnight',
                accountId,
                addresses: [
                  { address: address.shielded },
                  { address: address.unshielded },
                  { address: address.dust },
                ],
              }),
            });
          },
        };
      },
    );
  });
});

describe('updateSyncProgress', () => {
  // Mirrors watchMidnightAccount, which registers the wallet before subscribing
  // this effect.
  beforeEach(() => {
    midnightWallets$.next({ [accountId]: {} as MidnightWallet });
  });
  afterEach(() => {
    midnightWallets$.next({});
  });

  const snapshot = (ratio = 0.9, complete = false): SyncProgress => ({
    shielded: Percent(ratio),
    dust: Percent(ratio),
    unshielded: Percent(ratio),
    isStrictlyComplete: {
      shielded: complete,
      dust: complete,
      unshielded: complete,
    },
    isConnected: { shielded: true, dust: true, unshielded: true },
    indexerLiveness: 'InSync',
  });

  const withDelayedDispatch = (
    exercise: (harness: {
      progress$: Subject<SyncProgress>;
      flush: () => void;
      getState: () => SyncSliceState;
      dispatched: Array<{ type: string }>;
    }) => void,
  ) => {
    const progress$ = new Subject<SyncProgress>();
    let state = syncReducers.sync(undefined, { type: 'init' });
    const statuses$ = new BehaviorSubject(state.syncStatusByAccount);
    const dispatched: Array<{ type: string }> = [];
    testSideEffect<Selectors, ActionCreators>(
      {
        build: ({ cold }) =>
          updateSyncProgress(
            createMockMidnightWallet(cold, { syncProgress$: progress$ }),
            of(true),
            midnightWallets$,
          ),
      },
      ({ flush }) => ({
        stateObservables: { sync: { selectSyncStatusByAccount$: statuses$ } },
        dependencies: { actions },
        assertion: sideEffect$ => {
          // createStore defers epic dispatch. Synchronous reducer feedback hides
          // races between snapshots emitted before that queue drains.
          const subscription = sideEffect$.pipe(delay(0)).subscribe(action => {
            dispatched.push(action);
            state = syncReducers.sync(state, action);
            statuses$.next(state.syncStatusByAccount);
          });
          try {
            exercise({ progress$, flush, getState: () => state, dispatched });
          } finally {
            subscription.unsubscribe();
          }
        },
      }),
    );
  };

  it.each([
    [
      'completion followed by progress',
      [snapshot(1, true), snapshot()],
      'syncing',
    ],
    [
      'progress followed by completion',
      [snapshot(0.95), snapshot(1, true)],
      'synced',
    ],
    [
      'failure followed by recovery',
      [{ ...snapshot(), indexerLiveness: 'WrongNetwork' }, snapshot()],
      'syncing',
    ],
    [
      'recovery followed by failure',
      [snapshot(1, true), { ...snapshot(), indexerLiveness: 'WrongNetwork' }],
      'error',
    ],
    [
      'completion followed by unknown work',
      [snapshot(1, true), { ...snapshot(), dust: undefined }],
      'syncing',
    ],
  ] as const)(
    'applies %s in order across delayed dispatch',
    (_, snapshots, expectedStatus) => {
      withDelayedDispatch(({ progress$, flush, getState, dispatched }) => {
        progress$.next(snapshot());
        flush();
        for (const value of snapshots) progress$.next(value);
        flush();
        expect(selectGlobalSyncStatus({ sync: getState() })).toBe(
          expectedStatus,
        );
        expect(dispatched).toHaveLength(3);
        progress$.next(snapshots[1]);
        flush();
        expect(selectGlobalSyncStatus({ sync: getState() })).toBe(
          expectedStatus,
        );
        expect(dispatched).toHaveLength(3);
        if (expectedStatus === 'syncing') {
          expect(
            getState().syncStatusByAccount[accountId].pendingSync?.operations[
              `${accountId}-midnight-sync`
            ],
          ).toMatchObject({ status: 'InProgress' });
        }
      });
    },
  );

  it('dispatches once for 10,000 snapshots within the same displayed percentage', () => {
    withDelayedDispatch(({ progress$, flush, dispatched }) => {
      for (let index = 0; index < 10000; index++)
        progress$.next(snapshot(0.48 + (index % 100) / 10000));
      flush();
      expect(dispatched).toHaveLength(1);
      expect(dispatched[0]).toMatchObject({
        payload: { operation: { progress: 0.48 } },
      });
    });
  });

  it('coalesces a percentage burst to its first and latest displayed percentages', () => {
    withDelayedDispatch(({ progress$, flush, dispatched }) => {
      for (let index = 0; index < 10000; index++)
        progress$.next(snapshot(0.1 + index / 12500));
      flush();
      expect(dispatched).toHaveLength(2);
      expect(dispatched[0]).toMatchObject({
        payload: { operation: { progress: 0.1 } },
      });
      expect(dispatched[1]).toMatchObject({
        payload: { operation: { progress: 0.89 } },
      });
    });
  });

  it('passes health and completion immediately and cancels queued percentages', () => {
    testSideEffect<Selectors, ActionCreators>(
      {
        build: ({ cold }) =>
          updateSyncProgress(
            createMockMidnightWallet(cold, {
              syncProgress$: cold('a 9ms b 9ms c 9ms d', {
                a: snapshot(0.1),
                b: snapshot(0.2),
                c: { ...snapshot(), indexerLiveness: 'WrongNetwork' },
                d: snapshot(1, true),
              }),
            }),
            of(true),
            midnightWallets$,
          ),
      },
      ({ expectObservable }) => ({
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(
            sideEffect$.pipe(
              delay(0),
              map(action =>
                actions.sync.applySyncOperationSnapshot.match(action)
                  ? action.payload.operation.status
                  : 'unexpected',
              ),
            ),
          ).toBe('a 19ms b 9ms c', {
            a: 'InProgress',
            b: 'Failed',
            c: 'Completed',
          });
        },
      }),
    );
  });

  it('renders health loss, unknown work and recovery using the real sync reducer', () => {
    const progress$ = new Subject<SyncProgress>();
    let state = syncReducers.sync(undefined, { type: 'init' });
    const statuses$ = new BehaviorSubject(state.syncStatusByAccount);
    const complete: SyncProgress = {
      shielded: Percent(1),
      dust: Percent(1),
      unshielded: Percent(1),
      isStrictlyComplete: { shielded: true, dust: true, unshielded: true },
      isConnected: { shielded: true, dust: true, unshielded: true },
      indexerLiveness: 'InSync',
    };
    testSideEffect<Selectors, ActionCreators>(
      {
        build: ({ cold }) =>
          updateSyncProgress(
            createMockMidnightWallet(cold, { syncProgress$: progress$ }),
            of(true),
            midnightWallets$,
          ),
      },
      () => ({
        actionObservables: {},
        stateObservables: { sync: { selectSyncStatusByAccount$: statuses$ } },
        dependencies: { actions },
        assertion: sideEffect$ => {
          const subscription = sideEffect$.subscribe(action => {
            state = syncReducers.sync(state, action);
            statuses$.next(state.syncStatusByAccount);
          });
          const globalStatus = () => selectGlobalSyncStatus({ sync: state });
          const percentage = () =>
            computeAccountSyncingProgress(state.syncStatusByAccount[accountId]);

          progress$.next({
            ...complete,
            isConnected: { dust: false, shielded: false, unshielded: false },
          });
          expect(globalStatus()).toBe('syncing');
          expect(percentage()).toBeUndefined();
          expect(
            computeAccountSyncStatusDetail(
              state.syncStatusByAccount[accountId],
            ),
          ).toBe('v2.sync-status.detail.waiting-for-data');
          expect(
            state.syncStatusByAccount[accountId].lastSuccessfulSync,
          ).toBeUndefined();

          progress$.next(complete);
          expect(globalStatus()).toBe('synced');
          const previousSuccess =
            state.syncStatusByAccount[accountId].lastSuccessfulSync;
          expect(previousSuccess).toBeDefined();

          progress$.next({ ...complete, indexerLiveness: 'Unavailable' });
          expect(globalStatus()).toBe('syncing');
          expect(percentage()).toBeUndefined();
          expect(
            computeAccountSyncStatusDetail(
              state.syncStatusByAccount[accountId],
            ),
          ).toBe('v2.sync-status.detail.check-failed');
          progress$.next({
            ...complete,
            isStrictlyComplete: { ...complete.isStrictlyComplete, dust: false },
          });
          expect(
            computeAccountSyncStatusDetail(
              state.syncStatusByAccount[accountId],
            ),
          ).toBeUndefined();

          progress$.next({ ...complete, indexerLiveness: 'WrongNetwork' });
          expect(globalStatus()).toBe('error');
          expect(state.syncStatusByAccount[accountId].lastSuccessfulSync).toBe(
            previousSuccess,
          );
          expect(percentage()).toBeUndefined();

          progress$.next({
            ...complete,
            dust: undefined,
            isStrictlyComplete: { ...complete.isStrictlyComplete, dust: false },
          });
          expect(globalStatus()).toBe('syncing');
          expect(percentage()).toBeUndefined();
          expect(
            state.syncStatusByAccount[accountId].pendingSync?.operations[
              `${accountId}-midnight-sync`
            ],
          ).toMatchObject({
            status: 'InProgress',
            type: 'Indeterminate',
          });

          progress$.next(complete);
          expect(globalStatus()).toBe('synced');
          expect(
            state.syncStatusByAccount[accountId].pendingSync,
          ).toBeUndefined();
          subscription.unsubscribe();
        },
      }),
    );
  });

  it('emits a snapshot on first emit and ignores unshielded when disabled', () => {
    const syncProgress: SyncProgress = {
      shielded: Percent(0.5),
      unshielded: Percent(0.2),
      dust: Percent(0.5),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(
            wallet,
            cold('a', { a: false }),
            midnightWallets$,
          );
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.applySyncOperationSnapshot({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.5), // min(shielded=0.5, dust=0.5)
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('emits a completed snapshot when sync progress reaches 1', () => {
    // min(shielded=1, dust=1) = 1 and both are strictly complete (unshielded disabled).
    const syncProgress: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(0),
      dust: Percent(1),
      isStrictlyComplete: { dust: true, shielded: true, unshielded: true },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(
            wallet,
            cold('a', { a: false }),
            midnightWallets$,
          );
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.applySyncOperationSnapshot({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'Completed',
                  completedAt: expect.any(Number) as Timestamp,
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('drops progress that arrives after the wallet was stopped, so a cleared sync record stays cleared', () => {
    const inProgress: SyncProgress = {
      shielded: Percent(0.5),
      unshielded: Percent(0),
      dust: Percent(1),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };
    const complete: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(0),
      dust: Percent(1),
      isStrictlyComplete: { dust: false, shielded: true, unshielded: true },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a 999ms b', { a: inProgress, b: complete }),
          });
          return updateSyncProgress(
            wallet,
            cold('a', { a: false }),
            midnightWallets$,
          );
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              // The state resetAccountSyncStatus leaves behind, which is what
              // sends a late emission down the re-create branch.
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            cold('500ms a').subscribe(() => {
              midnightWallets$.next({});
            });

            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.applySyncOperationSnapshot({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.5),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('drops a trailing emission that was queued before the wallet was stopped', () => {
    const inProgress: SyncProgress = {
      shielded: Percent(0.5),
      unshielded: Percent(0),
      dust: Percent(1),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };
    const complete: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(0),
      dust: Percent(1),
      isStrictlyComplete: { dust: false, shielded: true, unshielded: true },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            // 'b' enters the throttle at frame 1 while the wallet is still
            // registered, and is held as the trailing value until frame 500.
            syncProgress$: cold('ab|', { a: inProgress, b: complete }),
          });
          return updateSyncProgress(
            wallet,
            cold('a', { a: false }),
            midnightWallets$,
          );
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            cold('250ms a').subscribe(() => {
              // Another account stays registered, so this also pins the gate to
              // the stopped account rather than to the registry being empty.
              midnightWallets$.next({
                ['other-account' as AccountId]: {} as MidnightWallet,
              });
            });

            expectObservable(sideEffect$).toBe('a 499ms |', {
              a: actions.sync.applySyncOperationSnapshot({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.5),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('emits snapshots when progress changes after sync already started (uses min of shielded+dust when unshielded disabled)', () => {
    // When unshielded is disabled: progress = min(shielded, dust)
    const syncProgressPartial: SyncProgress = {
      shielded: Percent(0.5),
      unshielded: Percent(0),
      dust: Percent(0.5),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };
    const syncProgressComplete: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(0),
      dust: Percent(1),
      isStrictlyComplete: { dust: true, shielded: true, unshielded: true },
    };

    const operationId = `${accountId}-midnight-sync`;

    // State that shows sync is already in progress
    const pendingSyncStatus: Record<AccountId, AccountSyncStatus> = {
      [accountId]: {
        pendingSync: {
          startedAt: Timestamp(Date.now()),
          operations: {
            [operationId]: {
              operationId,
              status: 'InProgress',
              type: 'Determinate',
              progress: Percent(0),
              description: 'sync.operation.midnight-wallet-sync',
              startedAt: Timestamp(Date.now()),
            },
          },
        },
      },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            // Emit b 501ms after a (trailing space required for Xms to be parsed
            // as a time progression by the RxJS marble parser), so b arrives after
            // the 500ms throttleTime window and passes through immediately.
            syncProgress$: cold('a 500ms b', {
              a: syncProgressPartial,
              b: syncProgressComplete,
            }),
          });
          return updateSyncProgress(
            wallet,
            cold('a', { a: false }),
            midnightWallets$,
          );
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              // Start with pending sync status already present
              selectSyncStatusByAccount$: cold('a', { a: pendingSyncStatus }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            // First emission (a) passes through throttle immediately (leading).
            // Second emission (b) arrives after the 500ms throttle window and
            // passes through as the leading edge of a new throttle window.
            expectObservable(sideEffect$).toBe('a 500ms b', {
              a: actions.sync.applySyncOperationSnapshot({
                accountId,
                operation: {
                  operationId,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.5),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
              b: actions.sync.applySyncOperationSnapshot({
                accountId,
                operation: {
                  operationId,
                  status: 'Completed',
                  completedAt: expect.any(Number) as Timestamp,
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('reports 0 and does not complete while dust is at 0, despite shielded being complete', () => {
    const syncProgress: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(0),
      dust: Percent(0),
      isStrictlyComplete: { dust: false, shielded: true, unshielded: true },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(
            wallet,
            cold('a', { a: false }),
            midnightWallets$,
          );
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.applySyncOperationSnapshot({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0), // min(shielded=1, dust=0)
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('includes unstarted dust (0) in displayed progress (unshielded enabled)', () => {
    const syncProgress: SyncProgress = {
      shielded: Percent(0.7),
      unshielded: Percent(0.7),
      dust: Percent(0),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(
            wallet,
            cold('a', { a: true }),
            midnightWallets$,
          );
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.applySyncOperationSnapshot({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0), // min(shielded=0.7, unshielded=0.7, dust=0)
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('calculates progress as min of shielded+unshielded+dust when feature flag is enabled', () => {
    // When unshielded is enabled: progress = min(shielded, unshielded, dust).
    // shielded=1, unshielded=0, dust=1 → unshielded is the bottleneck → min = 0.
    const syncProgress: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(0),
      dust: Percent(1),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(
            wallet,
            cold('a', { a: true }),
            midnightWallets$,
          );
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.applySyncOperationSnapshot({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0), // min(shielded=1, unshielded=0, dust=1)
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('does not let an empty dust wallet (reported as 1) drag down the min', () => {
    // An SDK-confirmed empty Dust wallet reports Percent(1), so it must
    // never lower the displayed progress below the genuinely-lagging sub-wallets.
    // shielded=0.8, unshielded=0.8, dust=1 → min = 0.8.
    const syncProgress: SyncProgress = {
      shielded: Percent(0.8),
      unshielded: Percent(0.8),
      dust: Percent(1),
      isStrictlyComplete: { dust: true, shielded: false, unshielded: false },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(
            wallet,
            cold('a', { a: true }),
            midnightWallets$,
          );
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.applySyncOperationSnapshot({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.8), // min(shielded=0.8, unshielded=0.8, dust=1)
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('completes sync when all active sub-wallets are 1 and strictly complete (empty dust reported as 1)', () => {
    // shielded=1, unshielded=1, dust=1 (empty dust reported as 1), all strictly complete → completes.
    const syncProgress: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(1),
      dust: Percent(1),
      isStrictlyComplete: { dust: true, shielded: true, unshielded: true },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(
            wallet,
            cold('a', { a: true }),
            midnightWallets$,
          );
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.applySyncOperationSnapshot({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'Completed',
                  completedAt: expect.any(Number) as Timestamp,
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('does not complete sync when ratio is 1 but isStrictlyComplete is false (false completion regression)', () => {
    // Matching numeric cursors do not independently confirm completion.
    // The SDK can still withhold strict completion based on its other checks.
    // min(shielded=1, dust=1) = 1 but no sub-wallet is strictly complete.
    const syncProgress: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(0),
      dust: Percent(1),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(
            wallet,
            cold('a', { a: false }),
            midnightWallets$,
          );
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.applySyncOperationSnapshot({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(1),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('reports the slowest sub-wallet as progress (min, not average)', () => {
    // min(shielded=0.9, unshielded=0.3, dust=0.6) = 0.3 — the slowest sub-wallet is the bottleneck.
    const syncProgress: SyncProgress = {
      shielded: Percent(0.9),
      unshielded: Percent(0.3),
      dust: Percent(0.6),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(
            wallet,
            cold('a', { a: true }),
            midnightWallets$,
          );
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            // Progress is the slowest sub-wallet (0.3), not the average (0.6).
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.applySyncOperationSnapshot({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.3),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });
});

const dustParams = {
  nightDustRatio: 10n,
  generationDecayRate: 1n,
};

describe('updateDustBalance', () => {
  // Mirrors watchMidnightAccount, which registers the wallet before subscribing
  // this effect.
  beforeEach(() => {
    midnightWallets$.next({ [accountId]: {} as MidnightWallet });
  });
  afterEach(() => {
    midnightWallets$.next({});
  });

  const makeCoin = (generatedNow: bigint) =>
    ({
      generatedNow,
      maxCap: 0n,
      rate: 0n,
      dtime: undefined,
      maxCapReachedAt: new Date(0),
    } as unknown as never);

  it('does not emit duplicate setDustBalance when same balance emits twice', () => {
    testSideEffect(
      {
        build: ({ cold }) => {
          // State emits twice with the same balance
          const mockState = {
            dust: {
              totalCoins: [makeCoin(1000n)],
              availableCoins: [makeCoin(1000n)],
              state: { state: { params: dustParams } },
            },
          } as unknown as FacadeState;
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a-a', { a: mockState }),
          });
          return updateDustBalance(wallet, midnightWallets$);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a-', {
              a: actions.midnightContext.setDustBalance({
                accountId,
                dustBalance: BigNumber(1000n),
                dustAvailable: BigNumber(1000n),
              }),
            });
          },
        };
      },
    );
  });

  it('emits setDustBalance when wallet.state() emits different balance values', () => {
    testSideEffect(
      {
        build: ({ cold }) => {
          // State emits with different balance values
          const mockState1 = {
            dust: {
              totalCoins: [makeCoin(1000n)],
              availableCoins: [makeCoin(1000n)],
              state: { state: { params: dustParams } },
            },
          } as unknown as FacadeState;
          const mockState2 = {
            dust: {
              totalCoins: [makeCoin(2000n)],
              availableCoins: [makeCoin(2000n)],
              state: { state: { params: dustParams } },
            },
          } as unknown as FacadeState;
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a----b', { a: mockState1, b: mockState2 }),
          });
          return updateDustBalance(wallet, midnightWallets$);
        },
      },
      ({ flush }) => {
        const emissions: unknown[] = [];
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            sideEffect$.subscribe(action => emissions.push(action));
            flush();
            const dustBalanceActions = emissions.filter(
              (
                a,
              ): a is ReturnType<
                typeof actions.midnightContext.setDustBalance
              > =>
                (a as { type?: string }).type ===
                'midnightContext/setDustBalance',
            );
            expect(dustBalanceActions).toHaveLength(2);
            expect(
              BigNumber.valueOf(dustBalanceActions[0].payload.dustBalance),
            ).toBe(1000n);
            expect(
              BigNumber.valueOf(dustBalanceActions[1].payload.dustBalance),
            ).toBe(2000n);
          },
        };
      },
    );
  });

  // The balance keeps counting a pending dust coin (so the tank does not read 0
  // mid-send); `dustAvailable` is what drops to 0 — nothing is left to spend.
  it('emits non-zero setDustBalance with a ZERO available when all dust is pending', () => {
    testSideEffect(
      {
        build: ({ cold }) => {
          const mockState = {
            dust: {
              totalCoins: [makeCoin(2_980_000_000_000_000_000n)],
              availableCoins: [],
              state: { state: { params: dustParams } },
            },
          } as unknown as FacadeState;
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a', { a: mockState }),
          });
          return updateDustBalance(wallet, midnightWallets$);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.midnightContext.setDustBalance({
                accountId,
                dustBalance: BigNumber(2_980_000_000_000_000_000n),
                dustAvailable: BigNumber(0n),
              }),
            });
          },
        };
      },
    );
  });

  // A pending spend leaves the total untouched, so a balance-only distinct would
  // swallow the emission that says the account can no longer fund a transfer.
  it('emits when only the available half changes', () => {
    testSideEffect(
      {
        build: ({ cold }) => {
          const dustState = (available: bigint[]) =>
            ({
              dust: {
                totalCoins: [makeCoin(1000n)],
                availableCoins: available.map(makeCoin),
                state: { state: { params: dustParams } },
              },
            } as unknown as FacadeState);
          const wallet = createMockMidnightWallet(cold, {
            state: () =>
              cold('a-b', { a: dustState([1000n]), b: dustState([]) }),
          });
          return updateDustBalance(wallet, midnightWallets$);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            // 'b' is held as the throttle's trailing value until frame 500.
            expectObservable(sideEffect$).toBe('a 499ms b', {
              a: actions.midnightContext.setDustBalance({
                accountId,
                dustBalance: BigNumber(1000n),
                dustAvailable: BigNumber(1000n),
              }),
              b: actions.midnightContext.setDustBalance({
                accountId,
                dustBalance: BigNumber(1000n),
                dustAvailable: BigNumber(0n),
              }),
            });
          },
        };
      },
    );
  });

  it('coalesces a burst of balance changes into the leading and trailing value', () => {
    const mockState = (generatedNow: bigint) =>
      ({
        dust: {
          totalCoins: [makeCoin(generatedNow)],
          availableCoins: [makeCoin(generatedNow)],
          state: { state: { params: dustParams } },
        },
      } as unknown as FacadeState);

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            state: () =>
              cold('abcd', {
                a: mockState(1n),
                b: mockState(2n),
                c: mockState(3n),
                d: mockState(4n),
              }),
          });
          return updateDustBalance(wallet, midnightWallets$);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a 499ms b', {
              a: actions.midnightContext.setDustBalance({
                accountId,
                dustBalance: BigNumber(1n),
                dustAvailable: BigNumber(1n),
              }),
              b: actions.midnightContext.setDustBalance({
                accountId,
                dustBalance: BigNumber(4n),
                dustAvailable: BigNumber(4n),
              }),
            });
          },
        };
      },
    );
  });

  it('drops a trailing emission that was queued before the wallet was stopped', () => {
    const mockState = (generatedNow: bigint) =>
      ({
        dust: {
          totalCoins: [makeCoin(generatedNow)],
          availableCoins: [makeCoin(generatedNow)],
          state: { state: { params: dustParams } },
        },
      } as unknown as FacadeState);

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            // 'b' enters the throttle at frame 1 while the wallet is still
            // registered, and is held as the trailing value until frame 500.
            state: () => cold('ab|', { a: mockState(1n), b: mockState(2n) }),
          });
          return updateDustBalance(wallet, midnightWallets$);
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            cold('250ms a').subscribe(() => {
              // Another account stays registered, so this pins the gate to the
              // stopped account rather than to the registry being empty.
              midnightWallets$.next({
                ['other-account' as AccountId]: {} as MidnightWallet,
              });
            });

            expectObservable(sideEffect$).toBe('a 499ms |', {
              a: actions.midnightContext.setDustBalance({
                accountId,
                dustBalance: BigNumber(1n),
                dustAvailable: BigNumber(1n),
              }),
            });
          },
        };
      },
    );
  });
});

describe('updateDustGenerationDetails', () => {
  // Mirrors watchMidnightAccount, which registers the wallet before subscribing
  // this effect.
  beforeEach(() => {
    midnightWallets$.next({ [accountId]: {} as MidnightWallet });
  });
  afterEach(() => {
    midnightWallets$.next({});
  });

  it('emits setDustGenerationDetails with aggregated details when availableCoinsWithFullInfo returns coins', () => {
    const decayTime1 = new Date(1000);
    const maxCapReachedAt1 = new Date(2000);
    const decayTime2 = new Date(500);
    const maxCapReachedAt2 = new Date(3000);
    const coinsWithFullInfo = [
      {
        generatedNow: 10n,
        maxCap: 100n,
        rate: 1n,
        dtime: decayTime1,
        maxCapReachedAt: maxCapReachedAt1,
      },
      {
        generatedNow: 20n,
        maxCap: 200n,
        rate: 2n,
        dtime: decayTime2,
        maxCapReachedAt: maxCapReachedAt2,
      },
    ];
    const mockState = {
      dust: {
        totalCoins: coinsWithFullInfo,
        state: { state: { params: dustParams } },
      },
    } as unknown as FacadeState;

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a', { a: mockState }),
          });
          return updateDustGenerationDetails(wallet, midnightWallets$);
        },
      },
      ({ flush }) => {
        const emissions: unknown[] = [];
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            sideEffect$.subscribe(action => emissions.push(action));
            flush();
            const dustGenActions = emissions.filter(
              (
                a,
              ): a is ReturnType<
                typeof actions.midnightContext.setDustGenerationDetails
              > =>
                (a as { type?: string }).type ===
                'midnightContext/setDustGenerationDetails',
            );
            expect(dustGenActions).toHaveLength(1);
            // Payload is serialized (Serializable.to) in the action
            expect(dustGenActions[0].payload).toMatchObject({
              accountId,
              dustGenerationDetails: {
                currentValue: {
                  __storeSerializedType: 'bigint',
                  value: '30',
                },
                maxCap: {
                  __storeSerializedType: 'bigint',
                  value: '300',
                },
                rate: {
                  __storeSerializedType: 'bigint',
                  value: '3',
                },
                decayTime: 500,
                maxCapReachedAt: 3000,
              },
            });
          },
        };
      },
    );
  });

  it('does not emit duplicate setDustGenerationDetails when same details emit twice (distinctUntilChanged)', () => {
    const coinsWithFullInfo = [
      {
        generatedNow: 5n,
        maxCap: 50n,
        rate: 1n,
        dtime: new Date(1000),
        maxCapReachedAt: new Date(2000),
      },
    ];
    const mockState = {
      dust: {
        totalCoins: coinsWithFullInfo,
        state: { state: { params: dustParams } },
      },
    } as unknown as FacadeState;

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a-a', { a: mockState }),
          });
          return updateDustGenerationDetails(wallet, midnightWallets$);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a-', {
              a: actions.midnightContext.setDustGenerationDetails({
                accountId,
                dustGenerationDetails: {
                  currentValue: 5n,
                  maxCap: 50n,
                  decayTime: 1000,
                  maxCapReachedAt: 2000,
                  rate: 1n,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('emits setDustGenerationDetails with undefined when no coins available', () => {
    const mockState = {
      dust: {
        totalCoins: [],
        state: { state: { params: dustParams } },
      },
    } as unknown as FacadeState;

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a', { a: mockState }),
          });
          return updateDustGenerationDetails(wallet, midnightWallets$);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.midnightContext.setDustGenerationDetails({
                accountId,
                dustGenerationDetails: undefined,
              }),
            });
          },
        };
      },
    );
  });

  it('emits non-zero details when all dust is pending', () => {
    const pendingCoin = {
      generatedNow: 30n,
      maxCap: 100n,
      rate: 1n,
      dtime: new Date(1000),
      maxCapReachedAt: new Date(2000),
    };
    const mockState = {
      dust: {
        totalCoins: [pendingCoin],
        state: { state: { params: dustParams } },
      },
    } as unknown as FacadeState;

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a', { a: mockState }),
          });
          return updateDustGenerationDetails(wallet, midnightWallets$);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.midnightContext.setDustGenerationDetails({
                accountId,
                dustGenerationDetails: {
                  currentValue: 30n,
                  maxCap: 100n,
                  decayTime: 1000,
                  maxCapReachedAt: 2000,
                  rate: 1n,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('coalesces a burst of detail changes into the leading and trailing value', () => {
    const mockState = (generatedNow: bigint) =>
      ({
        dust: {
          totalCoins: [
            {
              generatedNow,
              maxCap: 100n,
              rate: 1n,
              dtime: undefined,
              maxCapReachedAt: undefined,
            },
          ],
        },
      } as unknown as FacadeState);

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            state: () =>
              cold('abcd', {
                a: mockState(1n),
                b: mockState(2n),
                c: mockState(3n),
                d: mockState(4n),
              }),
          });
          return updateDustGenerationDetails(wallet, midnightWallets$);
        },
      },
      ({ expectObservable }) => {
        const details = (currentValue: bigint) => ({
          currentValue,
          maxCap: 100n,
          decayTime: undefined,
          maxCapReachedAt: undefined,
          rate: 1n,
        });
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a 499ms b', {
              a: actions.midnightContext.setDustGenerationDetails({
                accountId,
                dustGenerationDetails: details(1n),
              }),
              b: actions.midnightContext.setDustGenerationDetails({
                accountId,
                dustGenerationDetails: details(4n),
              }),
            });
          },
        };
      },
    );
  });

  it('drops a trailing emission that was queued before the wallet was stopped', () => {
    const mockState = (generatedNow: bigint) =>
      ({
        dust: {
          totalCoins: [
            {
              generatedNow,
              maxCap: 100n,
              rate: 1n,
              dtime: undefined,
              maxCapReachedAt: undefined,
            },
          ],
        },
      } as unknown as FacadeState);

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('ab|', { a: mockState(1n), b: mockState(2n) }),
          });
          return updateDustGenerationDetails(wallet, midnightWallets$);
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            cold('250ms a').subscribe(() => {
              midnightWallets$.next({
                ['other-account' as AccountId]: {} as MidnightWallet,
              });
            });

            expectObservable(sideEffect$).toBe('a 499ms |', {
              a: actions.midnightContext.setDustGenerationDetails({
                accountId,
                dustGenerationDetails: {
                  currentValue: 1n,
                  maxCap: 100n,
                  decayTime: undefined,
                  maxCapReachedAt: undefined,
                  rate: 1n,
                },
              }),
            });
          },
        };
      },
    );
  });
});

describe('updateSetPublicKeys', () => {
  const coinKeyHex = 'deadbeef';
  const encryptionKeyHex = 'cafebabe';
  const mockShieldedKeys = {
    coinPublicKey: { toHexString: () => coinKeyHex },
    encryptionPublicKey: { toHexString: () => encryptionKeyHex },
  };

  it('emits setPublicKeys with coin and encryption keys from wallet.state()', () => {
    testSideEffect(
      {
        build: ({ cold }) => {
          const mockState = {
            shielded: mockShieldedKeys,
          } as unknown as FacadeState;
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a', { a: mockState }),
          });
          return updateSetPublicKeys(wallet);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(a|)', {
              a: actions.midnightContext.setPublicKeys({
                accountId,
                publicKeys: {
                  coin: HexBytes(coinKeyHex),
                  encryption: HexBytes(encryptionKeyHex),
                },
              }),
            });
          },
        };
      },
    );
  });

  it('only emits once (take(1)) even when wallet.state() emits multiple times', () => {
    testSideEffect(
      {
        build: ({ cold }) => {
          const mockState1 = {
            shielded: mockShieldedKeys,
          } as unknown as FacadeState;
          const mockState2 = {
            shielded: {
              coinPublicKey: { toHexString: () => '11111111' },
              encryptionPublicKey: { toHexString: () => '22222222' },
            },
          } as unknown as FacadeState;
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a-b', { a: mockState1, b: mockState2 }),
          });
          return updateSetPublicKeys(wallet);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(a|)', {
              a: actions.midnightContext.setPublicKeys({
                accountId,
                publicKeys: {
                  coin: HexBytes(coinKeyHex),
                  encryption: HexBytes(encryptionKeyHex),
                },
              }),
            });
          },
        };
      },
    );
  });
});

describe('updateTokens', () => {
  const tokenX = TokenId('X');
  const tokenY = TokenId('Y');

  describe('setAddressTokens', () => {
    it('emits setAddressTokens action for shielded tokens', () => {
      const address: MidnightWalletAddress = {
        shielded: midnightShieldedAddress,
        unshielded: midnightUnshieldedAddress,
        dust: midnightDustAddress,
      };

      const coinsByTokenType: ObservableMidnightWalletCoinsByTokenType = {
        shielded: {
          [tokenX]: [
            { status: 'available', value: BigNumber(2n) },
            { status: 'pending', value: BigNumber(5n) },
          ],
          [tokenY]: [{ status: 'available', value: BigNumber(3n) }],
        },
        unshielded: {},
      };

      testSideEffect(
        {
          build: ({ cold }) => {
            const wallet = createMockMidnightWallet(cold, {
              address$: cold('a', { a: address }),
              coinsByTokenType$: cold('a', { a: coinsByTokenType }),
            });
            return updateTokens(wallet, cold('a', { a: false }));
          },
        },
        ({ cold, flush }) => {
          const emissions: unknown[] = [];
          return {
            actionObservables: {},
            stateObservables: {
              tokens: {
                selectTokensMetadata$: cold<MetadataByTokenId>('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              const setAddressTokensActions = emissions.filter(
                (a): a is ReturnType<typeof actions.tokens.setAddressTokens> =>
                  (a as { type?: string }).type ===
                  'rawTokens/setAddressTokens',
              );
              expect(setAddressTokensActions).toHaveLength(1);
              expect(setAddressTokensActions[0]).toEqual(
                actions.tokens.setAddressTokens({
                  accountId,
                  address: midnightShieldedAddress,
                  blockchainName: 'Midnight',
                  tokens: [
                    createMidnightToken(tokenX, {
                      available: 2n,
                      pending: 5n,
                    }),
                    createMidnightToken(tokenY, {
                      available: 3n,
                      pending: 0n,
                    }),
                  ],
                }),
              );
            },
          };
        },
      );
    });

    it('emits setAddressTokens action for unshielded tokens when feature is enabled', () => {
      const address: MidnightWalletAddress = {
        shielded: midnightShieldedAddress,
        unshielded: midnightUnshieldedAddress,
        dust: midnightDustAddress,
      };

      const coinsByTokenType: ObservableMidnightWalletCoinsByTokenType = {
        shielded: {},
        unshielded: {
          [tokenX]: [
            {
              status: 'available',
              value: BigNumber(2n),
              registeredForDustGeneration: false,
            },
            {
              status: 'pending',
              value: BigNumber(5n),
              registeredForDustGeneration: false,
            },
          ],
          [tokenY]: [
            {
              status: 'available',
              value: BigNumber(3n),
              registeredForDustGeneration: false,
            },
          ],
        },
      };

      testSideEffect(
        {
          build: ({ cold }) => {
            const wallet = createMockMidnightWallet(cold, {
              address$: cold('a', { a: address }),
              coinsByTokenType$: cold('a', { a: coinsByTokenType }),
            });
            return updateTokens(wallet, cold('a', { a: true }));
          },
        },
        ({ cold, flush }) => {
          const emissions: unknown[] = [];
          return {
            actionObservables: {},
            stateObservables: {
              tokens: {
                selectTokensMetadata$: cold<MetadataByTokenId>('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              const setAddressTokensActions = emissions.filter(
                (a): a is ReturnType<typeof actions.tokens.setAddressTokens> =>
                  (a as { type?: string }).type ===
                  'rawTokens/setAddressTokens',
              );
              expect(setAddressTokensActions).toHaveLength(2);
              expect(setAddressTokensActions[0]).toEqual(
                actions.tokens.setAddressTokens({
                  accountId,
                  address: midnightShieldedAddress,
                  blockchainName: 'Midnight',
                  tokens: [],
                }),
              );
              expect(setAddressTokensActions[1]).toEqual(
                actions.tokens.setAddressTokens({
                  accountId,
                  address: midnightUnshieldedAddress,
                  blockchainName: 'Midnight',
                  tokens: [
                    createMidnightToken(tokenX, {
                      available: 2n,
                      pending: 5n,
                    }),
                    createMidnightToken(tokenY, {
                      available: 3n,
                      pending: 0n,
                    }),
                  ],
                }),
              );
            },
          };
        },
      );
    });

    it('does not emit setAddressTokens action for unshielded tokens when feature is disabled', () => {
      const address: MidnightWalletAddress = {
        shielded: midnightShieldedAddress,
        unshielded: midnightUnshieldedAddress,
        dust: midnightDustAddress,
      };

      const coinsByTokenType: ObservableMidnightWalletCoinsByTokenType = {
        shielded: {},
        unshielded: {
          [tokenX]: [
            {
              status: 'available',
              value: BigNumber(2n),
              registeredForDustGeneration: false,
            },
            {
              status: 'pending',
              value: BigNumber(5n),
              registeredForDustGeneration: false,
            },
          ],
          [tokenY]: [
            {
              status: 'available',
              value: BigNumber(3n),
              registeredForDustGeneration: false,
            },
          ],
        },
      };

      testSideEffect(
        {
          build: ({ cold }) => {
            const wallet = createMockMidnightWallet(cold, {
              address$: cold('a', { a: address }),
              coinsByTokenType$: cold('a', { a: coinsByTokenType }),
            });
            return updateTokens(wallet, cold('a', { a: false }));
          },
        },
        ({ cold, flush }) => {
          const emissions: unknown[] = [];
          return {
            actionObservables: {},
            stateObservables: {
              tokens: {
                selectTokensMetadata$: cold<MetadataByTokenId>('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              // Filter for setAddressTokens actions only
              const setAddressTokensActions = emissions.filter(
                (a): a is ReturnType<typeof actions.tokens.setAddressTokens> =>
                  (a as { type?: string }).type ===
                  'rawTokens/setAddressTokens',
              );
              // Only shielded (empty) action since feature is disabled
              expect(setAddressTokensActions).toHaveLength(1);
              expect(setAddressTokensActions[0]).toEqual(
                actions.tokens.setAddressTokens({
                  accountId,
                  address: midnightShieldedAddress,
                  blockchainName: 'Midnight',
                  tokens: [],
                }),
              );
            },
          };
        },
      );
    });
  });

  describe('upsertTokensMetadata', () => {
    it('emits upsertTokensMetadata action for shielded tokens', () => {
      const address: MidnightWalletAddress = {
        shielded: midnightShieldedAddress,
        unshielded: midnightUnshieldedAddress,
        dust: midnightDustAddress,
      };

      const coins = [{ status: 'available' as const, value: BigNumber(10n) }];
      const coinsByTokenType: ObservableMidnightWalletCoinsByTokenType = {
        shielded: {
          [tokenX]: coins,
        },
        unshielded: {},
      };

      testSideEffect(
        {
          build: ({ cold }) => {
            const wallet = createMockMidnightWallet(cold, {
              address$: cold('a', { a: address }),
              coinsByTokenType$: cold('a', { a: coinsByTokenType }),
            });
            return updateTokens(wallet, cold('a', { a: false }));
          },
        },
        ({ cold, flush }) => {
          const emissions: unknown[] = [];
          return {
            actionObservables: {},
            stateObservables: {
              tokens: {
                selectTokensMetadata$: cold<MetadataByTokenId>('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              const upsertMetadataActions = emissions.filter(
                (
                  a,
                ): a is ReturnType<
                  typeof actions.tokens.upsertTokensMetadata
                > =>
                  (a as { type?: string }).type ===
                  'tokensMetadata/upsertTokensMetadata',
              );
              expect(upsertMetadataActions).toHaveLength(1);
              expect(upsertMetadataActions[0]).toEqual(
                actions.tokens.upsertTokensMetadata({
                  metadatas: [
                    createInitialMidnightTokenMetadata({
                      tokenType: tokenX,
                      kind: 'shielded',
                      networkId,
                      coins,
                    }),
                  ],
                  balances: { [tokenX]: '10' },
                }),
              );
            },
          };
        },
      );
    });

    it('emits upsertTokensMetadata action for unshielded tokens when feature is enabled', () => {
      const address: MidnightWalletAddress = {
        shielded: midnightShieldedAddress,
        unshielded: midnightUnshieldedAddress,
        dust: midnightDustAddress,
      };

      const coins = [
        {
          status: 'available' as const,
          value: BigNumber(10n),
          registeredForDustGeneration: false,
        },
      ];
      const coinsByTokenType: ObservableMidnightWalletCoinsByTokenType = {
        shielded: {},
        unshielded: {
          [tokenX]: coins,
        },
      };

      testSideEffect(
        {
          build: ({ cold }) => {
            const wallet = createMockMidnightWallet(cold, {
              address$: cold('a', { a: address }),
              coinsByTokenType$: cold('a', { a: coinsByTokenType }),
            });
            return updateTokens(wallet, cold('a', { a: true }));
          },
        },
        ({ cold, flush }) => {
          const emissions: unknown[] = [];
          return {
            actionObservables: {},
            stateObservables: {
              tokens: {
                selectTokensMetadata$: cold<MetadataByTokenId>('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              const upsertMetadataActions = emissions.filter(
                (
                  a,
                ): a is ReturnType<
                  typeof actions.tokens.upsertTokensMetadata
                > =>
                  (a as { type?: string }).type ===
                  'tokensMetadata/upsertTokensMetadata',
              );
              expect(upsertMetadataActions).toHaveLength(1);
              expect(upsertMetadataActions[0]).toEqual(
                actions.tokens.upsertTokensMetadata({
                  metadatas: [
                    createInitialMidnightTokenMetadata({
                      tokenType: tokenX,
                      kind: 'unshielded',
                      networkId,
                      coins,
                    }),
                  ],
                  balances: { [tokenX]: '10' },
                }),
              );
            },
          };
        },
      );
    });

    it('does not emit upsertTokensMetadata action for unshielded tokens when feature is disabled', () => {
      const address: MidnightWalletAddress = {
        shielded: midnightShieldedAddress,
        unshielded: midnightUnshieldedAddress,
        dust: midnightDustAddress,
      };

      const coins = [
        {
          status: 'available' as const,
          value: BigNumber(10n),
          registeredForDustGeneration: false,
        },
      ];
      const coinsByTokenType: ObservableMidnightWalletCoinsByTokenType = {
        shielded: {},
        unshielded: {
          [tokenX]: coins,
        },
      };

      testSideEffect(
        {
          build: ({ cold }) => {
            const wallet = createMockMidnightWallet(cold, {
              address$: cold('a', { a: address }),
              coinsByTokenType$: cold('a', { a: coinsByTokenType }),
            });
            return updateTokens(wallet, cold('a', { a: false }));
          },
        },
        ({ cold, flush }) => {
          const emissions: unknown[] = [];
          return {
            actionObservables: {},
            stateObservables: {
              tokens: {
                selectTokensMetadata$: cold<MetadataByTokenId>('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              // Filter for upsertTokensMetadata actions only
              const upsertMetadataActions = emissions.filter(
                (
                  a,
                ): a is ReturnType<
                  typeof actions.tokens.upsertTokensMetadata
                > =>
                  (a as { type?: string }).type ===
                  'tokensMetadata/upsertTokensMetadata',
              );
              // No metadata actions expected since only unshielded tokens and feature is disabled
              expect(upsertMetadataActions).toHaveLength(0);
            },
          };
        },
      );
    });
  });
});

describe('watchMidnightAccounts', () => {
  const previewNetworkId = NetworkId.NetworkId.Preview;
  const undeployedNetworkId = NetworkId.NetworkId.Undeployed;

  const previewNetwork = {
    networkId: previewNetworkId,
    config: { nodeAddress: 'preview-node' } as unknown as MidnightNetworkConfig,
  };

  const undeployedNetwork = {
    networkId: undeployedNetworkId,
    config: {
      nodeAddress: 'undeployed-node',
    } as unknown as MidnightNetworkConfig,
  };

  const midnightAccount1 = {
    ...stubData.midnightAccount,
    accountId: stubData.accountId,
    blockchainSpecific: {
      ...stubData.midnightAccount.blockchainSpecific,
      networkId: previewNetworkId,
    },
  };

  const midnightAccount2 = {
    ...stubData.midnightAccount,
    accountId: (stubData.accountId + '-2') as AccountId,
    blockchainSpecific: {
      ...stubData.midnightAccount.blockchainSpecific,
      networkId: previewNetworkId,
    },
  };

  const midnightAccountDifferentNetwork = {
    ...stubData.midnightAccount,
    accountId: (stubData.accountId + '-undeployed') as AccountId,
    blockchainSpecific: {
      ...stubData.midnightAccount.blockchainSpecific,
      networkId: undeployedNetworkId,
    },
  };

  const cardanoAccount = {
    accountId: 'cardano-account' as AccountId,
    blockchainName: 'Cardano' as const,
    accountType: 'InMemory' as const,
    networkType: 'testnet' as const,
    walletId: stubData.walletId,
  } as InMemoryWalletAccount<MidnightAccountProps>;

  const createMockStore = (): CollectionStorage<SerializedMidnightWallet> =>
    ({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
      observeAll: vi.fn(),
      setAll: vi.fn(),
      upsert: vi.fn(() => of(void 0)),
      removeWhere: vi.fn(() => of(void 0)),
      clear: vi.fn(() => of(void 0)),
    } as CollectionStorage<SerializedMidnightWallet>);

  const logger = dummyLogger;

  it('restarts only the requested account and leaves its sibling subscribed', () => {
    const started: string[] = [];
    const stopped: string[] = [];
    const store = createMockStore();
    const watchAccount = vi.fn(
      (account: InMemoryWalletAccount<MidnightAccountProps>) => () =>
        new Observable<never>(() => {
          started.push(account.accountId);
          return () => {
            stopped.push(account.accountId);
          };
        }),
    );
    testSideEffect(
      watchMidnightAccounts(store, watchAccount),
      ({ hot, cold, flush }) => ({
        actionObservables: {
          midnightSync: {
            restartWalletWatch$: cold(''),
            restartAccountWatch$: hot('--a', {
              a: actions.midnightSync.restartAccountWatch({
                accountId: midnightAccount1.accountId,
              }),
            }),
          },
        },
        stateObservables: {
          midnightContext: {
            selectCurrentNetwork$: cold('a', { a: previewNetwork }),
          },
          wallets: {
            selectActiveNetworkAccounts$: cold('a', {
              a: [midnightAccount1, midnightAccount2],
            }),
            selectIsWalletRepoMigrating$: cold('a', { a: false }),
          },
        },
        dependencies: { actions, logger, isWalletActive$: of(true) },
        assertion: sideEffect$ => {
          const subscription = sideEffect$.subscribe();
          flush();
          expect(started).toEqual([
            midnightAccount1.accountId,
            midnightAccount2.accountId,
            midnightAccount1.accountId,
          ]);
          expect(stopped).toEqual([midnightAccount1.accountId]);
          subscription.unsubscribe();
        },
      }),
    );
  });

  describe('initial setup', () => {
    it('starts watching all Midnight accounts matching the current network immediately', () => {
      const mockStore = createMockStore();
      const mockWatchAccount = vi.fn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        () => () => of(actions.sync.addSyncOperation({} as any)),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1, midnightAccount2],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // watchAccount should be called for both accounts
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount1,
                previewNetwork.config,
                mockStore,
              );
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount2,
                previewNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });
  });

  describe('network changes', () => {
    it('stops all existing watchers when network changes (via switchMap)', () => {
      const mockStore = createMockStore();
      let isWatcherStoppedForMidnightAccount1 = false;
      const mockWatchAccount = vi.fn(
        account => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            return () => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (account.accountId === midnightAccount1.accountId) {
                isWatcherStoppedForMidnightAccount1 = true;
              }
            };
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                // Network changes from preview to undeployed
                selectCurrentNetwork$: cold('a-b', {
                  a: previewNetwork,
                  b: undeployedNetwork,
                }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b', {
                  a: [midnightAccount1],
                  b: [midnightAccountDifferentNetwork],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Watcher for midnightAccount1 should have been stopped when network changed
              expect(isWatcherStoppedForMidnightAccount1).toBe(true);
            },
          };
        },
      );
    });

    it('starts watching accounts matching the new network after network change', () => {
      const mockStore = createMockStore();

      const mockWatchAccount = vi.fn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        () => () => of(actions.sync.addSyncOperation({} as any)),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a-b', {
                  a: previewNetwork,
                  b: undeployedNetwork,
                }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b', {
                  a: [midnightAccount1],
                  b: [midnightAccountDifferentNetwork],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should be called twice: once for midnightAccount1 (preview), once for midnightAccountDifferentNetwork (undeployed)
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount1,
                previewNetwork.config,
                mockStore,
              );
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccountDifferentNetwork,
                undeployedNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });

    it('does not restart watchers if network changes to the same value (distinctUntilChanged)', () => {
      const mockStore = createMockStore();
      // Return never-completing observable to test distinctUntilChanged properly
      const mockWatchAccount = vi.fn(
        () => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            // Never completes - simulates active watcher
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                // Same network emitted multiple times - distinctUntilChanged filters to 1
                selectCurrentNetwork$: cold('a-a-a', { a: previewNetwork }),
              },
              wallets: {
                // Emit once - after distinctUntilChanged on network, only processes once
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should only be called once - distinctUntilChanged on network prevents restart
              expect(mockWatchAccount).toHaveBeenCalledTimes(1);
            },
          };
        },
      );
    });
  });

  describe('account lifecycle', () => {
    it('starts watching a new account when it appears in the accounts list', () => {
      const mockStore = createMockStore();
      // Return never-completing observable to prevent exhaustMap from allowing duplicates
      const mockWatchAccount = vi.fn(
        () => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            // Never completes - simulates active watcher
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                // Account2 appears in second emission
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b', {
                  a: [midnightAccount1],
                  b: [midnightAccount1, midnightAccount2],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should be called twice: once for midnightAccount1, once for midnightAccount2
              // exhaustMap prevents midnightAccount1 from starting again when it appears in second emission
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount2,
                previewNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });

    it('stops watching an account when it is removed from the accounts list (takeUntil)', () => {
      const mockStore = createMockStore();
      let isWatcherStoppedForAccount2 = false;
      const mockWatchAccount = vi.fn(
        account => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            return () => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (account.accountId === midnightAccount2.accountId) {
                isWatcherStoppedForAccount2 = true;
              }
            };
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                // Account2 removed in second emission
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b', {
                  a: [midnightAccount1, midnightAccount2],
                  b: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Watcher for midnightAccount2 should have been stopped
              expect(isWatcherStoppedForAccount2).toBe(true);
            },
          };
        },
      );
    });

    it('prevents duplicate watchers for the same account (exhaustMap)', () => {
      const mockStore = createMockStore();
      const mockWatchAccount = vi.fn(
        () => () =>
          // Return a never-completing observable to test exhaustMap
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                // Same account emitted multiple times
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b-c', {
                  a: [midnightAccount1],
                  b: [midnightAccount1],
                  c: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should only be called once due to exhaustMap
              expect(mockWatchAccount).toHaveBeenCalledTimes(1);
            },
          };
        },
      );
    });
  });

  describe('restart wallet watch', () => {
    it('restarts all watchers when restartWalletWatch$ action is dispatched', () => {
      const mockStore = createMockStore();

      const mockWatchAccount = vi.fn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        () => () => of(actions.sync.addSyncOperation({} as any)),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                // Restart triggered at frame 2
                restartWalletWatch$: cold('--a', {
                  a: actions.midnightSync.restartWalletWatch(),
                }),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should be called twice: initial + after restart
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
            },
          };
        },
      );
    });

    it('stops existing watchers before restarting (via switchMap)', () => {
      const mockStore = createMockStore();
      let isWatcherStopped = false;
      const mockWatchAccount = vi.fn(
        () => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            return () => {
              isWatcherStopped = true;
            };
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('--a', {
                  a: actions.midnightSync.restartWalletWatch(),
                }),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Watcher should have been stopped before restart
              expect(isWatcherStopped).toBe(true);
            },
          };
        },
      );
    });
  });

  describe('error handling', () => {
    it('does not crash the entire stream when one account watcher fails', () => {
      const mockStore = createMockStore();
      const errorLog = vi.spyOn(logger, 'error');
      const mockWatchAccount = vi.fn(account => () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (account.accountId === midnightAccount1.accountId) {
          return throwError(() => new Error('Watcher failed'));
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        return of(actions.sync.addSyncOperation({} as any));
      }) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1, midnightAccount2],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              const emissions: unknown[] = [];
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              // Should log error
              expect(errorLog).toHaveBeenCalledWith(
                'Account watch failure:',
                expect.any(Error),
              );
              // Should still process midnightAccount2
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount2,
                previewNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });

    it('continues watching other accounts when one account watcher errors', () => {
      const mockStore = createMockStore();
      const watchedAccountIds: string[] = [];
      const mockWatchAccount = vi.fn(account => () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        watchedAccountIds.push(String(account.accountId));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (account.accountId === midnightAccount1.accountId) {
          return throwError(() => new Error('Watcher failed'));
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        return of(actions.sync.addSyncOperation({} as any));
      }) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1, midnightAccount2],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Both accounts processed despite midnightAccount1 erroring, and
              // the healthy one is invoked exactly once — the retry budget is
              // per-account, so a sibling's failure never restarts it.
              expect(
                watchedAccountIds.filter(
                  id => id === String(midnightAccount2.accountId),
                ),
              ).toHaveLength(1);
              // defer re-invokes the failing account per retry: 1 + maxRetries.
              expect(
                watchedAccountIds.filter(
                  id => id === String(midnightAccount1.accountId),
                ),
              ).toHaveLength(
                1 + (PROVIDER_REQUEST_RETRY_CONFIG.maxRetries ?? 0),
              );
            },
          };
        },
      );
    });
  });

  describe('surfaced sync failure', () => {
    it('recovers after approval returns without clearing saved state or dispatching resync', () => {
      const store = createMockStore();
      const approved = {
        ...previewNetwork,
        config: {
          ...previewNetwork.config,
          filteredDustSyncIndexer: previewNetwork.config.indexerAddress,
          isFilteredDustSyncRolloutEnabled: true,
        },
      };
      const unavailable = {
        ...approved,
        config: { ...approved.config, isFilteredDustSyncRolloutEnabled: false },
      };
      const watchAccount = vi.fn<typeof watchMidnightAccount>(
        (_account, config) => () =>
          config.isFilteredDustSyncRolloutEnabled
            ? NEVER
            : throwError(
                () => new Error('Filtering unavailable, saved state retained'),
              ),
      );
      testSideEffect(
        watchMidnightAccounts(store, watchAccount),
        ({ cold, flush }) => ({
          actionObservables: {
            midnightSync: { restartWalletWatch$: NEVER },
          },
          stateObservables: {
            midnightContext: {
              selectCurrentNetwork$: cold('a 3000ms b 3000ms a', {
                a: approved,
                b: unavailable,
              }),
            },
            wallets: {
              selectIsWalletRepoMigrating$: of(false),
              selectActiveNetworkAccounts$: of([midnightAccount1]),
            },
          },
          dependencies: { actions, logger, isWalletActive$: of(true) },
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            const subscription = sideEffect$.subscribe(action =>
              emissions.push(action),
            );
            flush();
            expect(
              emissions.filter(action =>
                actions.failures.addFailure.match(action as never),
              ),
            ).toHaveLength(1);
            expect(watchAccount).toHaveBeenLastCalledWith(
              midnightAccount1,
              approved.config,
              store,
            );
            expect(
              watchAccount.mock.calls.filter(
                ([, config]) => config.isFilteredDustSyncRolloutEnabled,
              ),
            ).toHaveLength(2);
            expect(emissions).not.toContainEqual(actions.midnightSync.resync());
            expect(store.clear).not.toHaveBeenCalled();
            expect(store.removeWhere).not.toHaveBeenCalled();
            subscription.unsubscribe();
          },
        }),
      );
    });

    it('raises a retryable failure and a failed sync operation once retries are exhausted', () => {
      const mockStore = createMockStore();
      const mockWatchAccount = vi.fn(account => () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (account.accountId === midnightAccount1.accountId) {
          return throwError(() => new Error('Watcher failed'));
        }
        return NEVER;
      }) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              const emissions: unknown[] = [];
              sideEffect$.subscribe(action => emissions.push(action));
              flush();

              expect(emissions).toStrictEqual([
                actions.failures.addFailure({
                  failureId: MidnightSyncFailureId(midnightAccount1.accountId),
                  message: 'sync.error.midnight-sync-failed',
                  retryAction: actions.midnightSync.restartWalletWatch(),
                }),
                actions.sync.addSyncOperation({
                  accountId: midnightAccount1.accountId,
                  operation: {
                    operationId: `${midnightAccount1.accountId}-midnight-sync`,
                    status: 'Failed',
                    description: 'sync.operation.midnight-wallet-sync',
                    error: 'sync.error.midnight-sync-failed',
                    startedAt: expect.any(Number) as Timestamp,
                    failedAt: expect.any(Number) as Timestamp,
                  },
                }),
              ]);
            },
          };
        },
      );
    });

    it('abandons the retry loop for an account removed mid-failure, surfacing nothing', () => {
      const mockStore = createMockStore();
      let attempts = 0;
      const mockWatchAccount = vi.fn(() => () => {
        attempts += 1;
        return throwError(() => new Error('Watcher failed'));
      }) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                // The account is gone before the retry budget runs out.
                selectActiveNetworkAccounts$: cold('a 1ms b', {
                  a: [midnightAccount1],
                  b: [],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              const emissions: unknown[] = [];
              sideEffect$.subscribe(action => emissions.push(action));
              flush();

              expect(emissions).toStrictEqual([]);
              // Removal unsubscribes retryBackoff rather than letting it burn
              // the whole budget on an account that is already gone.
              expect(attempts).toBeLessThan(
                1 + (PROVIDER_REQUEST_RETRY_CONFIG.maxRetries ?? 0),
              );
            },
          };
        },
      );
    });
  });

  describe('watcher restart after failure or request', () => {
    // One watchAccount call per attempt: the first plus every retry.
    const attemptsPerWatch =
      1 + (PROVIDER_REQUEST_RETRY_CONFIG.maxRetries ?? 0);

    const failingWatchAccount = () =>
      vi.fn(
        () => () => throwError(() => new Error('Watcher failed')),
      ) as typeof watchMidnightAccount;

    const surfacedFailures = (emissions: unknown[]) =>
      emissions.filter(action =>
        actions.failures.addFailure.match(action as never),
      );

    it('restarts a failed watcher when the account list re-emits', () => {
      const watchAccount = failingWatchAccount();

      testSideEffect(
        watchMidnightAccounts(createMockStore(), watchAccount),
        ({ cold, flush }) => ({
          actionObservables: {
            midnightSync: {
              restartWalletWatch$: cold('---'),
              restartAccountWatch$: cold('---'),
            },
          },
          stateObservables: {
            midnightContext: {
              selectCurrentNetwork$: cold('a', { a: previewNetwork }),
            },
            wallets: {
              selectIsWalletRepoMigrating$: cold('a', { a: false }),
              // The list re-emits after the first watcher's retries ran out.
              selectActiveNetworkAccounts$: cold('a 3000ms b', {
                a: [midnightAccount1],
                b: [{ ...midnightAccount1 }],
              }),
            },
          },
          dependencies: { actions, logger, isWalletActive$: of(true) },
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(action => emissions.push(action));
            flush();

            expect(watchAccount).toHaveBeenCalledTimes(2 * attemptsPerWatch);
            expect(surfacedFailures(emissions)).toHaveLength(2);
          },
        }),
      );
    });

    it('restarts a live watcher once per request and keeps ignoring list re-emissions', () => {
      const started: string[] = [];
      const stopped: string[] = [];
      const watchAccount = vi.fn(
        (account: InMemoryWalletAccount<MidnightAccountProps>) => () =>
          new Observable<never>(() => {
            started.push(account.accountId);
            return () => {
              stopped.push(account.accountId);
            };
          }),
      );

      testSideEffect(
        watchMidnightAccounts(createMockStore(), watchAccount),
        ({ cold, hot, flush }) => ({
          actionObservables: {
            midnightSync: {
              restartWalletWatch$: cold('---'),
              restartAccountWatch$: hot('--a', {
                a: actions.midnightSync.restartAccountWatch({
                  accountId: midnightAccount1.accountId,
                }),
              }),
            },
          },
          stateObservables: {
            midnightContext: {
              selectCurrentNetwork$: cold('a', { a: previewNetwork }),
            },
            wallets: {
              selectIsWalletRepoMigrating$: cold('a', { a: false }),
              selectActiveNetworkAccounts$: cold('a---b', {
                a: [midnightAccount1],
                b: [{ ...midnightAccount1 }],
              }),
            },
          },
          dependencies: { actions, logger, isWalletActive$: of(true) },
          assertion: sideEffect$ => {
            const subscription = sideEffect$.subscribe();
            flush();

            expect(started).toEqual([
              midnightAccount1.accountId,
              midnightAccount1.accountId,
            ]);
            expect(stopped).toEqual([midnightAccount1.accountId]);

            subscription.unsubscribe();
            // Every watcher that started has been stopped: none leaked.
            expect(stopped).toEqual(started);
          },
        }),
      );
    });

    it('restarts a failed watcher on request, but not once the account is removed', () => {
      const watchAccount = failingWatchAccount();
      const restart = actions.midnightSync.restartAccountWatch({
        accountId: midnightAccount1.accountId,
      });

      testSideEffect(
        watchMidnightAccounts(createMockStore(), watchAccount),
        ({ cold, hot, flush }) => ({
          actionObservables: {
            midnightSync: {
              restartWalletWatch$: cold('---'),
              // The first request follows the exhausted retries; the second
              // follows the removal.
              restartAccountWatch$: hot('2500ms a 4499ms a', { a: restart }),
            },
          },
          stateObservables: {
            midnightContext: {
              selectCurrentNetwork$: cold('a', { a: previewNetwork }),
            },
            wallets: {
              selectIsWalletRepoMigrating$: cold('a', { a: false }),
              selectActiveNetworkAccounts$: cold('a 6000ms b', {
                a: [midnightAccount1],
                b: [],
              }),
            },
          },
          dependencies: { actions, logger, isWalletActive$: of(true) },
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(action => emissions.push(action));
            flush();

            expect(watchAccount).toHaveBeenCalledTimes(2 * attemptsPerWatch);
            expect(surfacedFailures(emissions)).toHaveLength(2);
          },
        }),
      );
    });
  });

  describe('selectActiveNetworkAccounts$ filtering', () => {
    it('filters out non-Midnight accounts', () => {
      const mockStore = createMockStore();

      const mockWatchAccount = vi.fn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        () => () => of(actions.sync.addSyncOperation({} as any)),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1, cardanoAccount],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should only watch midnight account
              expect(mockWatchAccount).toHaveBeenCalledTimes(1);
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount1,
                previewNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });

    it('includes all Midnight accounts matching current network', () => {
      const mockStore = createMockStore();

      const mockWatchAccount = vi.fn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        () => () => of(actions.sync.addSyncOperation({} as any)),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [
                    midnightAccount1,
                    midnightAccount2,
                    midnightAccountDifferentNetwork,
                  ],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should watch both preview network accounts
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount1,
                previewNetwork.config,
                mockStore,
              );
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount2,
                previewNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });
  });

  describe('wallet active gating', () => {
    it('does not start any watchers while wallet is inactive', () => {
      const mockStore = createMockStore();
      const mockWatchAccount = vi.fn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        () => () => of(actions.sync.addSyncOperation({} as any)),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              // `cold` (no `|`) so the gate stays subscribed across the run
              // — `of(false)` would complete and propagate completion through
              // `whileActive`'s `switchMap`, ending the side effect early.
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1, midnightAccount2],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('f', { f: false }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              expect(mockWatchAccount).not.toHaveBeenCalled();
            },
          };
        },
      );
    });

    it('starts watchers when wallet becomes active', () => {
      const mockStore = createMockStore();
      const mockWatchAccount = vi.fn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        () => () => of(actions.sync.addSyncOperation({} as any)),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              // Inactive at frame 0, becomes active at frame 4
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('f---t', { f: false, t: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              expect(mockWatchAccount).toHaveBeenCalledTimes(1);
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount1,
                previewNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });

    // Regression guard: this test fails if `whileActive` is moved
    // mid-pipeline — leaked inner subscriptions would keep the watcher
    // alive past the lock and `wallet.stop()` (via finalize) would not run.
    it('stops existing watchers when wallet transitions from active to inactive', () => {
      const mockStore = createMockStore();
      let isWatcherStopped = false;
      const mockWatchAccount = vi.fn(
        () => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            return () => {
              isWatcherStopped = true;
            };
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              // Active at frame 0, locked at frame 5
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('t----f', { t: true, f: false }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Watcher started while active, then teardown propagated on lock
              // — `finalize` in `watchMidnightAccount` runs `wallet.stop()`
              // (closing indexer + node-relay WebSockets) and removes the
              // wallet from `midnightWallets$`. The mock's teardown stands in
              // for those real-world side effects.
              expect(isWatcherStopped).toBe(true);
            },
          };
        },
      );
    });

    // Verifies the structural guarantee that enables resume-from-persisted-state:
    // the same `mockStore` instance is passed to `watchAccount` across a lock/unlock
    // cycle. The actual SDK-level restoration from `SerializedMidnightWallet`
    // (persisted every 5s by the SDK) and resume-from-`appliedIndex` happens
    // inside `watchMidnightAccount` → `startMidnightAccountWallet`. By passing
    // the same store reference, the SDK reads the persisted state and resumes
    // rather than performing a full resync.
    it('reuses the same persisted store across lock/unlock to enable wallet resume', () => {
      const mockStore = createMockStore();
      const mockWatchAccount = vi.fn(
        () => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              // Active → locked → active: simulates lock/unlock cycle.
              isWalletActive$: cold('t-f-t', {
                t: true,
                f: false,
              }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Watcher started once initially, then again after unlock
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
              // Each invocation receives the SAME persisted store instance,
              // so the SDK can deserialize the previous SerializedMidnightWallet
              // and resume from the stored appliedIndex on unlock.
              expect(mockWatchAccount).toHaveBeenNthCalledWith(
                1,
                midnightAccount1,
                previewNetwork.config,
                mockStore,
              );
              expect(mockWatchAccount).toHaveBeenNthCalledWith(
                2,
                midnightAccount1,
                previewNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });
  });

  describe('integration scenarios', () => {
    it('handles sequence: add account -> watch starts -> remove account -> watch stops', () => {
      const mockStore = createMockStore();
      let isWatcherStopped = false;
      const mockWatchAccount = vi.fn(
        account => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            return () => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (account.accountId === midnightAccount2.accountId) {
                isWatcherStopped = true;
              }
            };
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                // Add midnightAccount2, then remove it
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b-c', {
                  a: [midnightAccount1],
                  b: [midnightAccount1, midnightAccount2],
                  c: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount2,
                previewNetwork.config,
                mockStore,
              );
              expect(isWatcherStopped).toBe(true);
            },
          };
        },
      );
    });

    it('handles sequence: watch active -> network change -> old watch stops -> new watch starts', () => {
      const mockStore = createMockStore();
      let isPreviewWatcherStopped = false;
      const mockWatchAccount = vi.fn(
        account => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            return () => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (account.accountId === midnightAccount1.accountId) {
                isPreviewWatcherStopped = true;
              }
            };
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a-b', {
                  a: previewNetwork,
                  b: undeployedNetwork,
                }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b', {
                  a: [midnightAccount1],
                  b: [midnightAccountDifferentNetwork],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              expect(isPreviewWatcherStopped).toBe(true);
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccountDifferentNetwork,
                undeployedNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });

    it('handles sequence: watch active -> restart trigger -> watch stops -> watch restarts', () => {
      const mockStore = createMockStore();
      let isWatcherStopped = false;
      const mockWatchAccount = vi.fn(
        () => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            return () => {
              isWatcherStopped = true;
            };
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnightSync: {
                restartWalletWatch$: cold('--a', {
                  a: actions.midnightSync.restartWalletWatch(),
                }),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
              isWalletActive$: cold('a', { a: true }),
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              expect(isWatcherStopped).toBe(true);
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
            },
          };
        },
      );
    });
  });
});

describe('watchMidnightAccount instance ownership', () => {
  const config: MidnightNetworkConfig = {
    nodeAddress: 'https://node.example',
    indexerAddress: 'https://indexer.example',
    proofServer: { kind: 'local-host', url: 'http://localhost:6300' },
  };
  const setup = () => {
    const runtime = { app: 'lace-sdk' } as Parameters<
      typeof midnightWalletsForRuntime
    >[0];
    const addresses$ = new Subject<MidnightWalletAddress>();
    const engine = {
      accountId,
      walletId,
      networkId,
      address$: addresses$,
      state: () => NEVER,
      syncProgress$: NEVER,
      coinsByTokenType$: NEVER,
      stop: vi.fn(() => of(undefined)),
    } as unknown as MidnightWallet;
    const dependencies = {
      runtime,
      actions,
      logger: dummyLogger,
      accessAuthSecret: () => NEVER,
      startMidnightAccountWallet: vi.fn(() => of(engine)),
    } as unknown as Parameters<ReturnType<typeof watchMidnightAccount>>[2];
    const state = {
      features: { selectLoadedFeatures$: of({ featureFlags: [] }) },
      midnightContext: { selectNetworksConfig$: NEVER },
      sync: { selectSyncStatusByAccount$: of({}) },
      tokens: { selectTokensMetadata$: of({}) },
    } as unknown as Parameters<ReturnType<typeof watchMidnightAccount>>[1];
    const emissions: unknown[] = [];
    const network$ = new BehaviorSubject({
      networkId: stubData.midnightAccount.blockchainSpecific.networkId,
      config,
    });
    const restart$ = new Subject<unknown>();
    const active$ = new BehaviorSubject(true);
    const startLifecycle = () =>
      watchMidnightAccounts(
        {} as CollectionStorage<SerializedMidnightWallet>,
        watchMidnightAccount,
      )(
        {
          midnightSync: { restartWalletWatch$: restart$ },
        } as unknown as Parameters<ReturnType<typeof watchMidnightAccounts>>[0],
        {
          ...state,
          midnightContext: {
            selectCurrentNetwork$: network$,
            selectNetworksConfig$: NEVER,
          },
          wallets: {
            selectActiveNetworkAccounts$: of([stubData.midnightAccount]),
            selectIsWalletRepoMigrating$: of(false),
          },
        } as unknown as Parameters<ReturnType<typeof watchMidnightAccounts>>[1],
        { ...dependencies, isWalletActive$: active$ },
      ).subscribe({
        next: value => emissions.push(value),
        error: error => emissions.push(error),
      });
    const start = () =>
      watchMidnightAccount(
        stubData.midnightAccount,
        config,
        {} as CollectionStorage<SerializedMidnightWallet>,
      )(
        {} as Parameters<ReturnType<typeof watchMidnightAccount>>[0],
        state,
        dependencies,
      ).subscribe({
        next: value => emissions.push(value),
        error: error => emissions.push(error),
      });
    return {
      runtime,
      state,
      addresses$,
      engine,
      dependencies,
      emissions,
      start,
      startLifecycle,
      network$,
      restart$,
      active$,
    };
  };

  it('marks all restoring accounts pending before entering their startup, preserving historical success', () => {
    const fixture = setup();
    const accounts = [1, 2, 3].map(index => ({
      ...stubData.midnightAccount,
      accountId:
        `${accountId}-${index}` as typeof stubData.midnightAccount.accountId,
    }));
    const previousSuccess = Timestamp(123);
    let syncState: ReturnType<typeof syncReducers.sync> = {
      syncStatusByAccount: Object.fromEntries(
        accounts.map(account => [
          account.accountId,
          { lastSuccessfulSync: previousSuccess },
        ]),
      ),
    };
    const subscriptions = [];
    vi.mocked(
      fixture.dependencies.startMidnightAccountWallet,
    ).mockImplementation(({ account }) => {
      const status = syncState.syncStatusByAccount[account.accountId];
      expect(computeAccountSyncingProgress(status)).toBeUndefined();
      expect(computeAccountSyncStatusDetail(status)).toBe(
        'v2.sync-status.detail.waiting-for-data',
      );
      expect(selectGlobalSyncStatus({ sync: syncState })).toBe('syncing');
      return NEVER;
    });
    try {
      for (const account of accounts) {
        subscriptions.push(
          watchMidnightAccount(
            account,
            config,
            {} as CollectionStorage<SerializedMidnightWallet>,
          )(
            {} as Parameters<SideEffect>[0],
            fixture.state,
            fixture.dependencies,
          ).subscribe(action => {
            syncState = syncReducers.sync(syncState, action);
          }),
        );
      }
      expect(
        fixture.dependencies.startMidnightAccountWallet,
      ).toHaveBeenCalledTimes(3);
      for (const account of accounts) {
        const status = syncState.syncStatusByAccount[account.accountId];
        expect(status.lastSuccessfulSync).toBe(previousSuccess);
        expect(computeAccountSyncStatusDetail(status)).toBe(
          'v2.sync-status.detail.waiting-for-data',
        );
      }
    } finally {
      subscriptions.forEach(subscription => {
        subscription.unsubscribe();
      });
    }
  });

  it('replaces startup Pending with live progress and only completes on a complete SDK snapshot', () => {
    const fixture = setup();
    const progress$ = new Subject<SyncProgress>();
    fixture.engine.syncProgress$ = progress$;
    let syncState = syncReducers.sync(undefined, { type: 'init' });
    const syncStates$ = new BehaviorSubject(syncState.syncStatusByAccount);
    fixture.state.sync.selectSyncStatusByAccount$ = syncStates$;
    const subscription = watchMidnightAccount(
      stubData.midnightAccount,
      config,
      {} as CollectionStorage<SerializedMidnightWallet>,
    )(
      {} as Parameters<SideEffect>[0],
      fixture.state,
      fixture.dependencies,
    ).subscribe(action => {
      syncState = syncReducers.sync(syncState, action);
      syncStates$.next(syncState.syncStatusByAccount);
    });
    try {
      expect(
        computeAccountSyncStatusDetail(
          syncState.syncStatusByAccount[accountId],
        ),
      ).toBe('v2.sync-status.detail.waiting-for-data');
      const reportRestoration = vi.mocked(
        fixture.dependencies.startMidnightAccountWallet,
      ).mock.calls[0][0].onPreparationStatusChange!;
      reportRestoration(true);
      expect(
        computeAccountSyncStatusDetail(
          syncState.syncStatusByAccount[accountId],
        ),
      ).toBe('v2.sync-status.detail.preparing');
      expect(
        computeAccountSyncingProgress(syncState.syncStatusByAccount[accountId]),
      ).toBeUndefined();
      reportRestoration(false);
      expect(
        computeAccountSyncStatusDetail(
          syncState.syncStatusByAccount[accountId],
        ),
      ).toBe('v2.sync-status.detail.waiting-for-data');
      const snapshot = {
        shielded: Percent(0.5),
        unshielded: Percent(1),
        dust: Percent(0.25),
        isStrictlyComplete: { shielded: false, unshielded: true, dust: false },
        isConnected: { shielded: true, unshielded: true, dust: true },
        indexerLiveness: 'InSync',
      } as SyncProgress;
      progress$.next(snapshot);
      expect(
        computeAccountSyncingProgress(syncState.syncStatusByAccount[accountId]),
      ).toBe(25);
      expect(
        computeAccountSyncStatusDetail(
          syncState.syncStatusByAccount[accountId],
        ),
      ).toBeUndefined();
      expect(selectGlobalSyncStatus({ sync: syncState })).toBe('syncing');
      progress$.next({
        ...snapshot,
        shielded: Percent(1),
        dust: Percent(1),
        isStrictlyComplete: { shielded: true, unshielded: true, dust: true },
      });
      expect(selectGlobalSyncStatus({ sync: syncState })).toBe('synced');
    } finally {
      subscription.unsubscribe();
    }
  });

  it('unsubscribing one same-account watcher preserves the other registry and subscription', async () => {
    const a = setup();
    const b = setup();
    const subscriptionA = a.start();
    const subscriptionB = b.start();
    try {
      expect(midnightWalletsForRuntime(a.runtime).value[accountId]).toBe(
        a.engine,
      );
      expect(midnightWalletsForRuntime(b.runtime).value[accountId]).toBe(
        b.engine,
      );
      subscriptionA.unsubscribe();
      expect(midnightWalletsForRuntime(a.runtime).value).toEqual({});
      expect(midnightWalletsForRuntime(b.runtime).value[accountId]).toBe(
        b.engine,
      );
      b.addresses$.next({
        shielded: midnightShieldedAddress,
        unshielded: midnightUnshieldedAddress,
        dust: midnightDustAddress,
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(b.emissions).toHaveLength(2);
      expect(a.engine.stop).toHaveBeenCalledOnce();
      expect(b.engine.stop).not.toHaveBeenCalled();
    } finally {
      subscriptionA.unsubscribe();
      subscriptionB.unsubscribe();
    }
  });

  it('network switching, restart and lock affect only their own instance', () => {
    const a = setup();
    const b = setup();
    const subscriptionA = a.startLifecycle();
    const subscriptionB = b.startLifecycle();
    try {
      expect(midnightWalletsForRuntime(a.runtime).value[accountId]).toBe(
        a.engine,
      );
      a.restart$.next(undefined);
      expect(a.engine.stop).toHaveBeenCalledOnce();
      expect(midnightWalletsForRuntime(a.runtime).value[accountId]).toBe(
        a.engine,
      );
      a.network$.next({ networkId: MidnightSDKNetworkIds.PreProd, config });
      expect(midnightWalletsForRuntime(a.runtime).value).toEqual({});
      expect(midnightWalletsForRuntime(b.runtime).value[accountId]).toBe(
        b.engine,
      );
      a.active$.next(false);
      expect(b.engine.stop).not.toHaveBeenCalled();
    } finally {
      subscriptionA.unsubscribe();
      subscriptionB.unsubscribe();
    }
  });

  it.each(['observable error', 'synchronous throw'])(
    'logs teardown %s without removing a replacement or stopping its watcher',
    async failureMode => {
      const a = setup();
      const replacement = setup();
      const stopError = new Error('stop failed');
      const stop$ = new Subject<void>();
      const errorLog = vi.fn();
      a.dependencies.logger = { ...dummyLogger, error: errorLog };
      vi.mocked(a.engine.stop).mockImplementation(() => {
        if (failureMode === 'synchronous throw') throw stopError;
        return stop$;
      });
      const oldSubscription = a.start();
      vi.mocked(a.dependencies.startMidnightAccountWallet).mockReturnValue(
        of(replacement.engine),
      );
      const replacementSubscription = a.start();
      try {
        expect(() => {
          oldSubscription.unsubscribe();
        }).not.toThrow();
        expect(() => {
          oldSubscription.unsubscribe();
        }).not.toThrow();
        stop$.error(stopError);
        replacement.addresses$.next({
          shielded: midnightShieldedAddress,
          unshielded: midnightUnshieldedAddress,
          dust: midnightDustAddress,
        });
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(errorLog).toHaveBeenCalledOnce();
        expect(errorLog).toHaveBeenCalledWith(
          'Midnight account watch teardown: stop failed',
          stopError,
        );
        expect(midnightWalletsForRuntime(a.runtime).value[accountId]).toBe(
          replacement.engine,
        );
        expect(a.emissions).toHaveLength(3);
        expect(a.engine.stop).toHaveBeenCalledOnce();
        expect(replacement.engine.stop).not.toHaveBeenCalled();
      } finally {
        oldSubscription.unsubscribe();
        replacementSubscription.unsubscribe();
        replacementSubscription.unsubscribe();
      }
      expect(midnightWalletsForRuntime(a.runtime).value).toEqual({});
      expect(replacement.engine.stop).toHaveBeenCalledOnce();
    },
  );

  it('failed startup leaves the other instance usable and removes no engine', () => {
    const a = setup();
    const b = setup();
    vi.mocked(a.dependencies.startMidnightAccountWallet).mockReturnValue(
      throwError(() => new Error('startup failed')),
    );
    const subscriptionB = b.start();
    const subscriptionA = a.start();
    try {
      expect(a.emissions).toEqual([
        expect.objectContaining({ type: actions.sync.addSyncOperation.type }),
        new Error('startup failed'),
      ]);
      expect(midnightWalletsForRuntime(a.runtime).value).toEqual({});
      expect(midnightWalletsForRuntime(b.runtime).value[accountId]).toBe(
        b.engine,
      );
      expect(b.engine.stop).not.toHaveBeenCalled();
    } finally {
      subscriptionA.unsubscribe();
      subscriptionB.unsubscribe();
    }
  });
});
