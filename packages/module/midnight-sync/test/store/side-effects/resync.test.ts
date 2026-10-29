import { activitiesActions } from '@lace-contract/activities';
import { addressesActions } from '@lace-contract/addresses';
import { appActions } from '@lace-contract/app';
import {
  EMPTY_PARTIAL_NETWORKS_CONFIG,
  midnightContextActions,
  midnightWalletsForRuntime,
  MidnightAccountId,
  MidnightNetworkId,
  MidnightSDKNetworkIds,
  SerialisedWalletState,
} from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { syncActions } from '@lace-contract/sync';
import { tokensActions } from '@lace-contract/tokens';
import { walletsActions, WalletId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { defer, EMPTY, of, Subject, throwError } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { midnightSyncActions } from '../../../src/store/actions';
import { createMidnightSideEffectDependencies } from '../../../src/store/dependencies';
import {
  createClearWalletStateOnResync,
  createDeleteWalletSideEffect,
  createHeadlessResetSyncStateSideEffect,
  createResetSyncStateSideEffect,
  requestResyncWallet,
  resyncWalletOnConfigChangeFromFeatureFlags,
  stopAndWipeAccountState$,
} from '../../../src/store/side-effects/resync';

import type {
  MidnightWallet,
  SerializedMidnightWallet,
} from '@lace-contract/midnight-context';
import type { ModuleInitProps } from '@lace-contract/module';
import type { CollectionStorage } from '@lace-contract/storage';
import type { Action } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';

const { accountId, midnightAccount, midnightWallet, walletId, networkId } =
  stubData;

const actions = {
  ...midnightSyncActions,
  ...tokensActions,
  ...addressesActions,
  ...midnightContextActions,
  ...activitiesActions,
  ...syncActions,
  ...walletsActions,
  ...appActions,
};

const resetActionsFor = (id: typeof accountId) => [
  actions.addresses.resetAddresses({ accountId: id }),
  actions.tokens.resetAccountTokens({ accountId: id }),
  actions.activities.resetActivities({ accountId: id }),
  actions.midnightContext.resetAccountDust({ accountId: id }),
  actions.sync.resetAccountSyncStatus({ accountId: id }),
];

/**
 * Two reset requests for one account while its stop() hangs. The engine's own
 * stopMidnightWallet deregisters the wallet before stopping it, so the second
 * attempt finds nothing to stop and the reset can proceed. `runtime` keys the
 * app instance's wallet registry, which the engine's dependencies serve; it is
 * emptied afterwards.
 */
const runHungStopRetry = (
  sideEffect: (
    store: CollectionStorage<SerializedMidnightWallet>,
  ) => ReturnType<typeof createResetSyncStateSideEffect>,
  runtime: ModuleInitProps['runtime'],
  resetMarble: string,
) => {
  const siblingId = MidnightAccountId(walletId, 1, networkId);
  const pendingStop$ = new Subject<void>();
  const stop = vi.fn(() => pendingStop$);
  const siblingStop = vi.fn(() => of(undefined));
  const props = { runtime } as ModuleInitProps;
  const registry = midnightWalletsForRuntime(props.runtime);
  const dependencies = createMidnightSideEffectDependencies()(props, {
    logger: dummyLogger,
  });
  registry.next({
    [accountId]: { accountId, stop } as unknown as MidnightWallet,
    [siblingId]: {
      accountId: siblingId,
      stop: siblingStop,
    } as unknown as MidnightWallet,
  });
  const stopAccount = vi.fn(dependencies.stopMidnightWallet);
  const removeWhere = vi.fn(() => of(undefined));
  const emitted: Action[] = [];
  let emittedBeforeLateStop: Action[] = [];
  let registeredAfterReset: string[] = [];
  testSideEffect(
    sideEffect({
      removeWhere,
    } as unknown as CollectionStorage<SerializedMidnightWallet>),
    ({ hot, cold, flush }) => {
      removeWhere.mockImplementation(() =>
        cold('----------(a|)', { a: undefined }),
      );
      return {
        actionObservables: {
          midnightContext: {
            resetSyncState$: hot(resetMarble, {
              a: actions.midnightContext.resetSyncState({ accountId }),
            }),
          },
        },
        stateObservables: {
          wallets: {
            selectIsWalletRepoMigrating$: of(false),
            selectActiveNetworkAccounts$: of([
              midnightAccount,
              { ...midnightAccount, accountId: siblingId },
            ]),
          },
          midnightContext: {
            selectMidnightBlockchainNetworkId$: of(
              MidnightNetworkId(networkId),
            ),
          },
        },
        dependencies: {
          actions,
          logger: dummyLogger,
          stopMidnightWallet: stopAccount,
        },
        assertion: sideEffect$ => {
          const subscription = sideEffect$.subscribe(action =>
            emitted.push(action),
          );
          flush();
          emittedBeforeLateStop = [...emitted];
          registeredAfterReset = Object.keys(registry.value);
          pendingStop$.next();
          pendingStop$.complete();
          subscription.unsubscribe();
          registry.next({});
        },
      };
    },
  );
  return {
    dependencies,
    emitted,
    emittedBeforeLateStop,
    registeredAfterReset,
    registry,
    removeWhere,
    siblingId,
    siblingStop,
    stop,
    stopAccount,
  };
};

describe('midnight-sync/store/side-effects', () => {
  describe('stopAndWipeAccountState$', () => {
    const siblingId = MidnightAccountId(walletId, 1, networkId);
    const continueAfter = vi.fn((_step: string, _error: unknown) => of(void 0));
    const abortWith = vi.fn((_step: string, error: unknown) =>
      throwError(() => error),
    );

    const run = ({
      stop$ = of(undefined),
      wipe$ = of(undefined),
      onStepFailure = continueAfter,
    }: {
      stop$?: Observable<unknown>;
      wipe$?: Observable<void>;
      onStepFailure?: typeof continueAfter;
    }) => {
      const events: string[] = [];
      const removeWhere = vi.fn(
        (predicate: (wallet: SerializedMidnightWallet) => boolean) => {
          events.push('wipe');
          expect(
            predicate({ accountId } as unknown as SerializedMidnightWallet),
          ).toBe(true);
          expect(
            predicate({
              accountId: siblingId,
            } as unknown as SerializedMidnightWallet),
          ).toBe(false);
          expect(predicate(null as unknown as SerializedMidnightWallet)).toBe(
            false,
          );
          return wipe$;
        },
      );
      const emitted: Action[] = [];
      let error: unknown;
      stopAndWipeAccountState$({
        accountId,
        actions: actions as unknown as Parameters<
          typeof stopAndWipeAccountState$
        >[0]['actions'],
        store: {
          removeWhere,
        } as unknown as CollectionStorage<SerializedMidnightWallet>,
        stop$: defer(() => {
          events.push('stop');
          return stop$;
        }),
        onStepFailure,
      }).subscribe({
        next: action => emitted.push(action),
        error: (failure: unknown) => (error = failure),
      });
      return { emitted, error, events };
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("stops, then wipes only that account's state, then emits its five cache resets", () => {
      const { emitted, error, events } = run({});

      expect(events).toEqual(['stop', 'wipe']);
      expect(emitted).toEqual(resetActionsFor(accountId));
      expect(error).toBeUndefined();
      expect(continueAfter).not.toHaveBeenCalled();
    });

    it('wipes once even when the stop emits more than once', () => {
      const { emitted, events } = run({ stop$: of(undefined, undefined) });

      expect(events).toEqual(['stop', 'wipe']);
      expect(emitted).toEqual(resetActionsFor(accountId));
    });

    it.each([
      ['stop', { stop$: throwError(() => new Error('stop failed')) }],
      ['wipe', { wipe$: throwError(() => new Error('wipe failed')) }],
    ] as const)(
      'hands a failed %s to onStepFailure, which may carry on',
      (step, failure) => {
        const { emitted, error, events } = run(failure);

        expect(continueAfter).toHaveBeenCalledExactlyOnceWith(
          step,
          new Error(`${step} failed`),
        );
        expect(events).toEqual(['stop', 'wipe']);
        expect(emitted).toEqual(resetActionsFor(accountId));
        expect(error).toBeUndefined();
      },
    );

    it.each([
      ['stop', { stop$: EMPTY }],
      ['wipe', { wipe$: EMPTY }],
    ] as const)(
      'treats a %s that completes without acknowledging as failed',
      (step, failure) => {
        run(failure);

        expect(continueAfter).toHaveBeenCalledOnce();
        const [[failedStep, error]] = continueAfter.mock.calls;
        expect(failedStep).toBe(step);
        expect(String(error)).toContain('did not acknowledge');
      },
    );

    it('aborts before the wipe when onStepFailure rethrows a stop failure', () => {
      const { emitted, error, events } = run({
        stop$: throwError(() => new Error('stop failed')),
        onStepFailure: abortWith,
      });

      expect(events).toEqual(['stop']);
      expect(emitted).toEqual([]);
      expect(error).toEqual(new Error('stop failed'));
    });

    it('emits no resets when onStepFailure rethrows a wipe failure', () => {
      const { emitted, error, events } = run({
        wipe$: throwError(() => new Error('wipe failed')),
        onStepFailure: abortWith,
      });

      expect(events).toEqual(['stop', 'wipe']);
      expect(emitted).toEqual([]);
      expect(error).toEqual(new Error('wipe failed'));
    });
  });

  describe('createHeadlessResetSyncStateSideEffect', () => {
    it('retries a hung stop on a repeat request, ignores further requests while the reset runs, and ignores the late stop result', () => {
      const result = runHungStopRetry(
        createHeadlessResetSyncStateSideEffect,
        { app: 'lace-sdk' } as ModuleInitProps['runtime'],
        '--a--a--a',
      );

      expect(result.registry).toBe(result.dependencies.midnightWallets$);

      expect(result.stopAccount).toHaveBeenCalledTimes(2);
      expect(result.stop).toHaveBeenCalledOnce();
      expect(result.siblingStop).not.toHaveBeenCalled();
      expect(result.removeWhere).toHaveBeenCalledOnce();
      expect(result.registeredAfterReset).toEqual([result.siblingId]);
      expect(result.emitted.map(({ type }) => type)).toEqual([
        actions.sync.addSyncOperation.type,
        ...resetActionsFor(accountId).map(({ type }) => type),
        actions.sync.addSyncOperation.type,
        actions.midnightSync.restartAccountWatch.type,
      ]);
      expect(result.emitted).toEqual(result.emittedBeforeLateStop);
    });

    it.each([
      'success',
      'stop failure',
      'stop unacknowledged',
      'storage failure',
      'storage destroyed',
    ] as const)(
      '%s preserves the sibling account and never reloads',
      scenario => {
        const events: string[] = [];
        const siblingId = MidnightAccountId(walletId, 1, networkId);
        testSideEffect(
          createHeadlessResetSyncStateSideEffect({
            removeWhere: predicate => {
              events.push('wipe');
              expect(
                predicate({
                  accountId,
                  serializedState: null,
                } as unknown as SerializedMidnightWallet),
              ).toBe(true);
              expect(
                predicate({
                  accountId: siblingId,
                  walletId,
                  networkId,
                  serializedState: null,
                } as unknown as SerializedMidnightWallet),
              ).toBe(false);
              return scenario === 'storage destroyed'
                ? EMPTY
                : scenario === 'storage failure'
                ? throwError(() => new Error('storage unavailable'))
                : of(undefined);
            },
          } as CollectionStorage<SerializedMidnightWallet>),
          ({ hot, cold, flush }) => ({
            actionObservables: {
              midnightContext: {
                resetSyncState$: hot('--a', {
                  a: actions.midnightContext.resetSyncState({ accountId }),
                }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [
                    midnightAccount,
                    { ...midnightAccount, accountId: siblingId },
                  ],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies: {
              actions,
              logger: dummyLogger,
              stopMidnightWallet: id => {
                expect(id).toBe(accountId);
                events.push('stop');
                return scenario === 'stop failure'
                  ? cold('--#', {}, new Error('stop failed'))
                  : scenario === 'stop unacknowledged'
                  ? cold('--|')
                  : cold('--a', { a: undefined });
              },
            },
            assertion: sideEffect$ => {
              const emitted: { type: string; payload?: unknown }[] = [];
              const subscription = sideEffect$.subscribe(action =>
                emitted.push(action),
              );
              flush();
              subscription.unsubscribe();
              expect(events).toEqual(
                scenario.startsWith('stop') ? ['stop'] : ['stop', 'wipe'],
              );
              expect(
                emitted.some(
                  a => a.type === actions.app.reloadApplication.type,
                ),
              ).toBe(false);
              expect(
                emitted.every(
                  a =>
                    (a.payload as { accountId: string }).accountId ===
                    accountId,
                ),
              ).toBe(true);
              if (scenario === 'success') {
                expect(emitted.map(a => a.type)).toEqual([
                  actions.sync.addSyncOperation.type,
                  actions.addresses.resetAddresses.type,
                  actions.tokens.resetAccountTokens.type,
                  actions.activities.resetActivities.type,
                  actions.midnightContext.resetAccountDust.type,
                  actions.sync.resetAccountSyncStatus.type,
                  actions.sync.addSyncOperation.type,
                  actions.midnightSync.restartAccountWatch.type,
                ]);
              } else {
                expect(emitted).toHaveLength(2);
                expect(emitted[0]).toMatchObject({
                  payload: { operation: { status: 'Pending' } },
                });
                expect(emitted[1]).toMatchObject({
                  payload: {
                    operation: {
                      status: 'Failed',
                      error: 'sync.error.midnight-sync-failed',
                    },
                  },
                });
              }
            },
          }),
        );
      },
    );

    it('lets the caller retry after a failed reset', () => {
      const storage = {
        removeWhere: vi.fn(() => of(undefined)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;
      testSideEffect(
        createHeadlessResetSyncStateSideEffect(storage),
        ({ hot, cold, flush }) => {
          const stopMidnightWallet = vi
            .fn()
            .mockReturnValueOnce(cold('-#', {}, new Error('stop failed')))
            .mockReturnValueOnce(cold('-a', { a: undefined }));
          return {
            actionObservables: {
              midnightContext: {
                resetSyncState$: hot('--a---a', {
                  a: actions.midnightContext.resetSyncState({ accountId }),
                }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies: { actions, logger: dummyLogger, stopMidnightWallet },
            assertion: sideEffect$ => {
              const emitted: Action[] = [];
              const subscription = sideEffect$.subscribe(action =>
                emitted.push(action),
              );
              flush();
              subscription.unsubscribe();
              expect(stopMidnightWallet).toHaveBeenCalledTimes(2);
              expect(storage.removeWhere).toHaveBeenCalledOnce();
              expect(
                emitted.map(action =>
                  action.type === actions.sync.addSyncOperation.type
                    ? (
                        action as ReturnType<
                          typeof actions.sync.addSyncOperation
                        >
                      ).payload.operation.status
                    : action.type,
                ),
              ).toEqual([
                'Pending',
                'Failed',
                'Pending',
                ...resetActionsFor(accountId).map(({ type }) => type),
                'Pending',
                actions.midnightSync.restartAccountWatch.type,
              ]);
            },
          };
        },
      );
    });

    it('resets different accounts independently', () => {
      const siblingId = MidnightAccountId(walletId, 1, networkId);
      const storage = {
        removeWhere: vi.fn(() => of(undefined)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;
      testSideEffect(
        createHeadlessResetSyncStateSideEffect(storage),
        ({ hot, cold, flush }) => {
          const stopMidnightWallet = vi.fn((id: string) =>
            // The first account's stop hangs; the sibling's must not wait on it.
            id === accountId ? cold<void>('-') : cold('-a', { a: undefined }),
          );
          return {
            actionObservables: {
              midnightContext: {
                resetSyncState$: hot('--ab', {
                  a: actions.midnightContext.resetSyncState({ accountId }),
                  b: actions.midnightContext.resetSyncState({
                    accountId: siblingId,
                  }),
                }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [
                    midnightAccount,
                    { ...midnightAccount, accountId: siblingId },
                  ],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies: { actions, logger: dummyLogger, stopMidnightWallet },
            assertion: sideEffect$ => {
              const emitted: Action[] = [];
              const subscription = sideEffect$.subscribe(action =>
                emitted.push(action),
              );
              flush();
              subscription.unsubscribe();
              expect(stopMidnightWallet).toHaveBeenCalledTimes(2);
              expect(emitted).toContainEqual(
                actions.midnightSync.restartAccountWatch({
                  accountId: siblingId,
                }),
              );
              expect(emitted).not.toContainEqual(
                actions.midnightSync.restartAccountWatch({ accountId }),
              );
            },
          };
        },
      );
    });
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteWallet', () => {
    it("removing a wallet dispatches 'reset' actions", () => {
      const otherWalletId = WalletId('other-wallet-id');
      const walletStates: SerializedMidnightWallet[] = [
        {
          walletId,
          accountId,
          networkId: MidnightSDKNetworkIds.TestNet,
          serializedState: {
            dust: SerialisedWalletState(''),
            shielded: SerialisedWalletState(''),
            unshielded: SerialisedWalletState(''),
            txHistory: SerialisedWalletState(''),
          },
        },
        {
          walletId: otherWalletId,
          accountId: MidnightAccountId(otherWalletId, 0, networkId),
          networkId: MidnightSDKNetworkIds.TestNet,
          serializedState: {
            dust: SerialisedWalletState(''),
            shielded: SerialisedWalletState(''),
            unshielded: SerialisedWalletState(''),
            txHistory: SerialisedWalletState(''),
          },
        },
      ];

      const storage = {
        removeWhere: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;
      testSideEffect(
        createDeleteWalletSideEffect(storage),
        ({ expectObservable, flush, hot, cold }) => {
          const dependencies = {
            stopMidnightWallet: vi.fn().mockReturnValue(of(void 0)),
            actions,
          };

          return {
            actionObservables: {
              wallets: {
                removeWallet$: hot('-a', {
                  a: walletsActions.wallets.removeWallet(walletId, []),
                }),
              },
            },
            stateObservables: {
              wallets: {
                selectAll$: cold('a', { a: [midnightWallet] }),
              },
            },
            dependencies,
            assertion: (sideEffect$: Readonly<Observable<Action>>) => {
              expectObservable(sideEffect$).toBe('-(abc)', {
                a: actions.addresses.resetAddresses({ accountId }),
                b: actions.tokens.resetAccountTokens({ accountId }),
                c: actions.activities.resetActivities({ accountId }),
              });
              flush();
              expect(storage.removeWhere).toHaveBeenCalledTimes(1);
              // The predicate must select exactly the removed wallet's
              // entries, leaving the other wallet's state untouched.
              const predicate = vi.mocked(storage.removeWhere).mock.calls[0][0];
              expect(predicate(walletStates[0])).toBe(true);
              expect(predicate(walletStates[1])).toBe(false);
            },
          };
        },
      );
    });
  });

  describe('createClearWalletStateOnResync', () => {
    it('stops currently running midnight wallet', () => {
      const storage = {
        clear: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createClearWalletStateOnResync(storage),
        ({ flush, cold }) => {
          const dependencies = {
            stopAllMidnightWallets: vi
              .fn()
              .mockReturnValue(cold('a', { a: null })),
            actions,
            logger: dummyLogger,
          };

          return {
            actionObservables: {
              midnightSync: {
                resync$: cold('--b', { b: actions.midnightSync.resync() }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              expect(dependencies.stopAllMidnightWallets).toHaveBeenCalled();
            },
          };
        },
      );
    });

    it('clears stored state', () => {
      const storage = {
        clear: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createClearWalletStateOnResync(storage),
        ({ flush, cold }) => {
          const dependencies = {
            stopAllMidnightWallets: vi
              .fn()
              .mockReturnValue(cold('a', { a: null })),
            actions,
            logger: dummyLogger,
          };

          return {
            actionObservables: {
              midnightSync: {
                resync$: cold('--b', { b: actions.midnightSync.resync() }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              expect(storage.clear).toHaveBeenCalledTimes(1);
            },
          };
        },
      );
    });

    it('resets every derived store the wiped documents fed, then restarts the watch', () => {
      // Sync status is deliberately absent: requestResyncWallet registers a
      // Pending operation immediately before dispatching resync, and clearing
      // it here would drop the marker showing the resync running.
      const storage = {
        clear: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createClearWalletStateOnResync(storage),
        ({ expectObservable, cold }) => {
          const dependencies = {
            stopAllMidnightWallets: vi
              .fn()
              .mockReturnValue(cold('a', { a: null })),
            actions,
            logger: dummyLogger,
          };

          return {
            actionObservables: {
              midnightSync: {
                resync$: cold('--b', { b: actions.midnightSync.resync() }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('--(abcde)', {
                a: actions.addresses.resetAddresses({ accountId }),
                b: actions.tokens.resetAccountTokens({ accountId }),
                c: actions.activities.resetActivities({ accountId }),
                d: actions.midnightContext.resetAccountDust({ accountId }),
                e: actions.midnightSync.restartWalletWatch(),
              });
            },
          };
        },
      );
    });

    it('still wipes and restarts when stopping the wallets rejects', () => {
      // stopAllMidnightWallets deregisters before it stops, so the wallets are
      // already unreachable by the time it can fail. Aborting here would strand
      // them stopped with nothing to restart them.
      const logger = { ...dummyLogger, error: vi.fn() };
      const storage = {
        clear: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createClearWalletStateOnResync(storage),
        ({ flush, cold }) => ({
          actionObservables: {
            midnightSync: {
              resync$: cold('--b', { b: actions.midnightSync.resync() }),
            },
          },
          stateObservables: {
            wallets: {
              selectIsWalletRepoMigrating$: cold('a', { a: false }),
              selectActiveNetworkAccounts$: cold('a', { a: [midnightAccount] }),
            },
            midnightContext: {
              selectMidnightBlockchainNetworkId$: cold('a', {
                a: MidnightNetworkId(networkId),
              }),
            },
          },
          dependencies: {
            stopAllMidnightWallets: vi.fn(() =>
              throwError(() => new Error('stop boom')),
            ),
            actions,
            logger,
          },
          assertion: sideEffect$ => {
            const emitted: unknown[] = [];
            let hasErrored = false;
            sideEffect$.subscribe({
              next: action => emitted.push(action),
              error: () => (hasErrored = true),
            });
            flush();

            expect(hasErrored).toBe(false);
            expect(logger.error).toHaveBeenCalled();
            expect(storage.clear).toHaveBeenCalledTimes(1);
            expect(emitted).toContainEqual(
              actions.midnightSync.restartWalletWatch(),
            );
          },
        }),
      );
    });

    it('requests wallet watch restart', () => {
      const storage = {
        clear: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createClearWalletStateOnResync(storage),
        ({ expectObservable, cold }) => {
          const dependencies = {
            stopAllMidnightWallets: vi
              .fn()
              .mockReturnValue(cold('a', { a: null })),
            actions,
            logger: dummyLogger,
          };

          return {
            actionObservables: {
              midnightSync: {
                resync$: cold('--b', { b: actions.midnightSync.resync() }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('--(abcde)', {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                a: expect.any(Object),
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                b: expect.any(Object),
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                c: expect.any(Object),
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                d: expect.any(Object),
                e: actions.midnightSync.restartWalletWatch(),
              });
            },
          };
        },
      );
    });

    it('runs operations in correct order: stop, clear, then emit actions', () => {
      const executionEvents: string[] = [];
      const storage = {
        clear: vi.fn(() => {
          executionEvents.push('clear storage');
          return of(void 0);
        }),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createClearWalletStateOnResync(storage),
        ({ flush, cold }) => {
          const dependencies = {
            stopAllMidnightWallets: vi.fn(() => {
              executionEvents.push('stop');
              return cold('a', { a: void 0 });
            }),
            actions,
          };

          return {
            actionObservables: {
              midnightSync: {
                resync$: cold('--b', { b: actions.midnightSync.resync() }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              sideEffect$.subscribe(() => {
                executionEvents.push('emit actions');
              });
              flush();
              expect(executionEvents).toEqual([
                'stop',
                'clear storage',
                // four resets per account, then the watch restart
                ...Array.from({ length: 5 }, () => 'emit actions'),
              ]);
            },
          };
        },
      );
    });
  });

  describe('createResetSyncStateSideEffect', () => {
    const otherAccountId = MidnightAccountId(walletId, 1, networkId);

    it("clears the account's persisted state, then reloads the app", () => {
      const storage = {
        removeWhere: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createResetSyncStateSideEffect(storage),
        ({ expectObservable, flush, cold }) => {
          const dependencies = {
            stopMidnightWallet: vi.fn().mockReturnValue(of(void 0)),
            actions,
            logger: dummyLogger,
          };

          return {
            actionObservables: {
              midnightContext: {
                resetSyncState$: cold('--b', {
                  b: actions.midnightContext.resetSyncState({ accountId }),
                }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              // Reload (f) is emitted LAST — after the state resets — so a hard
              // reload can't preempt the persisted-state wipe.
              expectObservable(sideEffect$).toBe('--(abcdef)', {
                a: actions.addresses.resetAddresses({ accountId }),
                b: actions.tokens.resetAccountTokens({ accountId }),
                c: actions.activities.resetActivities({ accountId }),
                d: actions.midnightContext.resetAccountDust({ accountId }),
                e: actions.sync.resetAccountSyncStatus({ accountId }),
                f: actions.app.reloadApplication(),
              });
              flush();
              expect(storage.removeWhere).toHaveBeenCalledTimes(1);
              expect(storage.removeWhere).toHaveBeenCalledTimes(1);
            },
          };
        },
      );
    });

    it('targets only the requested account when several are active', () => {
      const secondAccount = { ...midnightAccount, accountId: otherAccountId };
      const storage = {
        removeWhere: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createResetSyncStateSideEffect(storage),
        ({ expectObservable, flush, cold }) => {
          const dependencies = {
            stopMidnightWallet: vi.fn().mockReturnValue(of(void 0)),
            actions,
            logger: dummyLogger,
          };

          return {
            actionObservables: {
              midnightContext: {
                resetSyncState$: cold('--b', {
                  b: actions.midnightContext.resetSyncState({
                    accountId: otherAccountId,
                  }),
                }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount, secondAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('--(abcdef)', {
                a: actions.addresses.resetAddresses({
                  accountId: otherAccountId,
                }),
                b: actions.tokens.resetAccountTokens({
                  accountId: otherAccountId,
                }),
                c: actions.activities.resetActivities({
                  accountId: otherAccountId,
                }),
                d: actions.midnightContext.resetAccountDust({
                  accountId: otherAccountId,
                }),
                e: actions.sync.resetAccountSyncStatus({
                  accountId: otherAccountId,
                }),
                f: actions.app.reloadApplication(),
              });
              flush();
              expect(dependencies.stopMidnightWallet).toHaveBeenCalledWith(
                otherAccountId,
              );
              expect(storage.removeWhere).toHaveBeenCalledTimes(1);
            },
          };
        },
      );
    });

    it('stops the wallet before removing its persisted state, then emits', () => {
      const executionEvents: string[] = [];
      const storage = {
        removeWhere: vi.fn(() => {
          executionEvents.push('remove persisted state');
          return of(void 0);
        }),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createResetSyncStateSideEffect(storage),
        ({ flush, cold }) => {
          const dependencies = {
            stopMidnightWallet: vi.fn(() => {
              executionEvents.push('stop');
              return of(void 0);
            }),
            actions,
            logger: dummyLogger,
          };

          return {
            actionObservables: {
              midnightContext: {
                resetSyncState$: cold('--b', {
                  b: actions.midnightContext.resetSyncState({ accountId }),
                }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              sideEffect$.subscribe(() => {
                executionEvents.push('emit');
              });
              flush();
              // The six emissions are the five reset actions plus the reload.
              expect(executionEvents).toEqual([
                'stop',
                'remove persisted state',
                'emit',
                'emit',
                'emit',
                'emit',
                'emit',
                'emit',
              ]);
            },
          };
        },
      );
    });

    it('does nothing when no active midnight account matches the payload', () => {
      const storage = {
        removeWhere: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createResetSyncStateSideEffect(storage),
        ({ expectObservable, flush, cold }) => {
          const dependencies = {
            stopMidnightWallet: vi.fn().mockReturnValue(of(void 0)),
            actions,
            logger: dummyLogger,
          };

          return {
            actionObservables: {
              midnightContext: {
                resetSyncState$: cold('--b', {
                  b: actions.midnightContext.resetSyncState({
                    accountId: otherAccountId,
                  }),
                }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('');
              flush();
              expect(storage.removeWhere).not.toHaveBeenCalled();
              expect(dependencies.stopMidnightWallet).not.toHaveBeenCalled();
            },
          };
        },
      );
    });

    it('still wipes, resets and reloads when stop() fails', () => {
      const storage = {
        removeWhere: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createResetSyncStateSideEffect(storage),
        ({ expectObservable, flush, cold }) => {
          const dependencies = {
            stopMidnightWallet: vi
              .fn()
              .mockReturnValue(cold('#', {}, new Error('stop failed'))),
            actions,
            logger: dummyLogger,
          };

          return {
            actionObservables: {
              midnightContext: {
                resetSyncState$: cold('--b', {
                  b: actions.midnightContext.resetSyncState({ accountId }),
                }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              // Never an error notification: that would reach
              // initializeSideEffects' merge() and tear down sibling effects.
              expectObservable(sideEffect$).toBe('--(abcdef)', {
                a: actions.addresses.resetAddresses({ accountId }),
                b: actions.tokens.resetAccountTokens({ accountId }),
                c: actions.activities.resetActivities({ accountId }),
                d: actions.midnightContext.resetAccountDust({ accountId }),
                e: actions.sync.resetAccountSyncStatus({ accountId }),
                f: actions.app.reloadApplication(),
              });
              flush();
              expect(storage.removeWhere).toHaveBeenCalledTimes(1);
            },
          };
        },
      );
    });

    it('still resets and reloads when the storage wipe fails', () => {
      const storage = {
        removeWhere: vi.fn(() => throwError(() => new Error('write failed'))),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createResetSyncStateSideEffect(storage),
        ({ expectObservable, flush, cold }) => {
          const dependencies = {
            stopMidnightWallet: vi.fn().mockReturnValue(of(void 0)),
            actions,
            logger: dummyLogger,
          };

          return {
            actionObservables: {
              midnightContext: {
                resetSyncState$: cold('--b', {
                  b: actions.midnightContext.resetSyncState({ accountId }),
                }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('--(abcdef)', {
                a: actions.addresses.resetAddresses({ accountId }),
                b: actions.tokens.resetAccountTokens({ accountId }),
                c: actions.activities.resetActivities({ accountId }),
                d: actions.midnightContext.resetAccountDust({ accountId }),
                e: actions.sync.resetAccountSyncStatus({ accountId }),
                f: actions.app.reloadApplication(),
              });
              flush();
            },
          };
        },
      );
    });

    it('resets and reloads even when nothing is persisted yet', () => {
      const storage = {
        // removeWhere is a no-op against an empty collection — it never reads
        // the whole set, so "nothing persisted yet" needs no special mock.
        removeWhere: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createResetSyncStateSideEffect(storage),
        ({ expectObservable, flush, cold }) => {
          const dependencies = {
            stopMidnightWallet: vi.fn().mockReturnValue(of(void 0)),
            actions,
            logger: dummyLogger,
          };

          return {
            actionObservables: {
              midnightContext: {
                resetSyncState$: cold('--b', {
                  b: actions.midnightContext.resetSyncState({ accountId }),
                }),
              },
            },
            stateObservables: {
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
              midnightContext: {
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
            },
            dependencies,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('--(abcdef)', {
                a: actions.addresses.resetAddresses({ accountId }),
                b: actions.tokens.resetAccountTokens({ accountId }),
                c: actions.activities.resetActivities({ accountId }),
                d: actions.midnightContext.resetAccountDust({ accountId }),
                e: actions.sync.resetAccountSyncStatus({ accountId }),
                f: actions.app.reloadApplication(),
              });
              flush();
              expect(storage.removeWhere).toHaveBeenCalledTimes(1);
            },
          };
        },
      );
    });

    it('lets a repeat press supersede a hung stop, then reloads once', () => {
      const result = runHungStopRetry(
        createResetSyncStateSideEffect,
        { app: 'lace-extension-carbon' } as ModuleInitProps['runtime'],
        '--a--a',
      );

      expect(result.registry).toBe(result.dependencies.midnightWallets$);

      expect(result.stopAccount).toHaveBeenCalledTimes(2);
      expect(result.stop).toHaveBeenCalledOnce();
      expect(result.siblingStop).not.toHaveBeenCalled();
      expect(result.removeWhere).toHaveBeenCalledOnce();
      expect(result.registeredAfterReset).toEqual([result.siblingId]);
      expect(result.emitted).toEqual([
        ...resetActionsFor(accountId),
        actions.app.reloadApplication(),
      ]);
      expect(result.emitted).toEqual(result.emittedBeforeLateStop);
    });

    it('logs, wipes, resets and reloads when stop() completes without emitting', () => {
      const storage = {
        removeWhere: vi.fn(() => of(void 0)),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;
      const logger = { ...dummyLogger, error: vi.fn() };

      testSideEffect(
        createResetSyncStateSideEffect(storage),
        ({ expectObservable, flush, cold }) => ({
          actionObservables: {
            midnightContext: {
              resetSyncState$: cold('--b', {
                b: actions.midnightContext.resetSyncState({ accountId }),
              }),
            },
          },
          stateObservables: {
            wallets: {
              selectIsWalletRepoMigrating$: cold('a', { a: false }),
              selectActiveNetworkAccounts$: cold('a', {
                a: [midnightAccount],
              }),
            },
            midnightContext: {
              selectMidnightBlockchainNetworkId$: cold('a', {
                a: MidnightNetworkId(networkId),
              }),
            },
          },
          dependencies: {
            stopMidnightWallet: vi.fn().mockReturnValue(EMPTY),
            actions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('--(abcdef)', {
              a: actions.addresses.resetAddresses({ accountId }),
              b: actions.tokens.resetAccountTokens({ accountId }),
              c: actions.activities.resetActivities({ accountId }),
              d: actions.midnightContext.resetAccountDust({ accountId }),
              e: actions.sync.resetAccountSyncStatus({ accountId }),
              f: actions.app.reloadApplication(),
            });
            flush();
            expect(storage.removeWhere).toHaveBeenCalledOnce();
            expect(logger.error).toHaveBeenCalledExactlyOnceWith(
              'Midnight reset sync state: stop failed',
              new Error('Midnight account stop did not acknowledge completion'),
            );
          },
        }),
      );
    });

    it('still resets and reloads when the storage wipe never acknowledges', () => {
      const storage = {
        removeWhere: vi.fn(() => EMPTY),
      } as unknown as CollectionStorage<SerializedMidnightWallet>;

      testSideEffect(
        createResetSyncStateSideEffect(storage),
        ({ expectObservable, cold }) => ({
          actionObservables: {
            midnightContext: {
              resetSyncState$: cold('--b', {
                b: actions.midnightContext.resetSyncState({ accountId }),
              }),
            },
          },
          stateObservables: {
            wallets: {
              selectIsWalletRepoMigrating$: cold('a', { a: false }),
              selectActiveNetworkAccounts$: cold('a', {
                a: [midnightAccount],
              }),
            },
            midnightContext: {
              selectMidnightBlockchainNetworkId$: cold('a', {
                a: MidnightNetworkId(networkId),
              }),
            },
          },
          dependencies: {
            stopMidnightWallet: vi.fn().mockReturnValue(of(void 0)),
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('--(abcdef)', {
              a: actions.addresses.resetAddresses({ accountId }),
              b: actions.tokens.resetAccountTokens({ accountId }),
              c: actions.activities.resetActivities({ accountId }),
              d: actions.midnightContext.resetAccountDust({ accountId }),
              e: actions.sync.resetAccountSyncStatus({ accountId }),
              f: actions.app.reloadApplication(),
            });
          },
        }),
      );
    });
  });

  describe('resyncWalletOnConfigChangeFromFeatureFlags', () => {
    it('does nothing when wallet is locked', () => {
      const authenticateenticationPrompt = vi.fn();

      testSideEffect(
        resyncWalletOnConfigChangeFromFeatureFlags,
        ({ expectObservable, cold, flush }) => {
          return {
            actionObservables: {},
            stateObservables: {
              appLock: {
                isUnlocked$: cold('a', { a: false }),
              },
              midnightContext: {
                selectCurrentNetwork$: cold('aa', {
                  a: {
                    networkId,
                    config: {
                      nodeAddress: 'http://nodeAddress',
                      proofServer: {
                        kind: 'local-host' as const,
                        url: 'http://proofServerAddress',
                      },
                      indexerAddress: 'http://indexerAddress',
                    },
                  },
                }),
                selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                  a: EMPTY_PARTIAL_NETWORKS_CONFIG,
                }),
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: (sideEffect$: Readonly<Observable<Action>>) => {
              expectObservable(sideEffect$).toBe('');
              flush();

              expect(authenticateenticationPrompt).not.toHaveBeenCalled();
            },
          };
        },
      );
    });

    it('sends resync action when password prompt flow completed with success', () => {
      testSideEffect(
        resyncWalletOnConfigChangeFromFeatureFlags,
        ({ expectObservable, cold }) => {
          return {
            actionObservables: {},
            stateObservables: {
              appLock: {
                isUnlocked$: cold('a', { a: true }),
              },
              midnightContext: {
                selectCurrentNetwork$: cold('aa', {
                  a: {
                    networkId,
                    config: {
                      nodeAddress: 'http://nodeAddress',
                      proofServer: {
                        kind: 'local-host' as const,
                        url: 'http://proofServerAddress',
                      },
                      indexerAddress: 'http://indexerAddress',
                    },
                  },
                }),
                selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                  a: EMPTY_PARTIAL_NETWORKS_CONFIG,
                }),
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: (sideEffect$: Readonly<Observable<Action>>) => {
              expectObservable(sideEffect$).toBe('(ab)', {
                a: actions.sync.addSyncOperation({
                  accountId,
                  operation: expect.objectContaining({
                    operationId: `${accountId}-midnight-sync`,
                    status: 'Pending',
                    description: 'sync.operation.midnight-resync',
                  }) as never,
                }),
                b: actions.midnightSync.resync(),
              });
            },
          };
        },
      );
    });

    it('does not send resync action again when joint config did not change', () => {
      testSideEffect(
        resyncWalletOnConfigChangeFromFeatureFlags,
        ({ expectObservable, cold }) => {
          return {
            actionObservables: {},
            stateObservables: {
              appLock: {
                isUnlocked$: cold('a', { a: true }),
              },
              midnightContext: {
                selectCurrentNetwork$: cold('aa', {
                  a: {
                    networkId,
                    config: {
                      nodeAddress: 'http://nodeAddress',
                      proofServer: {
                        kind: 'local-host' as const,
                        url: 'http://proofServerAddress',
                      },
                      indexerAddress: 'http://indexerAddress',
                    },
                  },
                }),
                selectNetworksConfigFeatureFlagsOverrides$: cold('a', {
                  a: EMPTY_PARTIAL_NETWORKS_CONFIG,
                }),
                selectMidnightBlockchainNetworkId$: cold('a', {
                  a: MidnightNetworkId(networkId),
                }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount],
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: (sideEffect$: Readonly<Observable<Action>>) => {
              expectObservable(sideEffect$).toBe('(ab)-', {
                a: actions.sync.addSyncOperation({
                  accountId,
                  operation: expect.objectContaining({
                    operationId: `${accountId}-midnight-sync`,
                    status: 'Pending',
                    description: 'sync.operation.midnight-resync',
                  }) as never,
                }),
                b: actions.midnightSync.resync(),
              });
            },
          };
        },
      );
    });
  });

  describe('requestResyncWallet', () => {
    it('sends resync action when successfully obtained password', () => {
      testSideEffect(requestResyncWallet, ({ cold, expectObservable }) => {
        return {
          actionObservables: {
            midnightSync: {
              requestResync$: cold('a'),
            },
          },
          stateObservables: {
            wallets: {
              selectIsWalletRepoMigrating$: cold('a', { a: false }),
              selectActiveNetworkAccounts$: cold('a', { a: [midnightAccount] }),
            },
            midnightContext: {
              selectMidnightBlockchainNetworkId$: cold('a', {
                a: MidnightNetworkId(networkId),
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.sync.addSyncOperation({
                accountId,
                operation: expect.objectContaining({
                  operationId: `${accountId}-midnight-sync`,
                  status: 'Pending',
                  description: 'sync.operation.midnight-resync',
                }) as never,
              }),
              b: actions.midnightSync.resync(),
            });
          },
        };
      });
    });

    it('resyncs accounts for the currently active network after network switch', () => {
      const previewNetworkId = MidnightSDKNetworkIds.Preview;
      const previewAccountId = MidnightAccountId(walletId, 0, previewNetworkId);
      const previewAccount = {
        ...midnightAccount,
        accountId: previewAccountId,
        blockchainNetworkId: MidnightNetworkId(previewNetworkId),
        blockchainSpecific: {
          ...midnightAccount.blockchainSpecific,
          networkId: previewNetworkId,
        },
      };

      testSideEffect(requestResyncWallet, ({ hot, expectObservable }) => {
        // Accounts include both networks, but only the active network's accounts should be used
        const allAccounts = [midnightAccount, previewAccount];

        return {
          actionObservables: {
            midnightSync: {
              // Frame 2: first request, Frame 7: second request
              requestResync$: hot('--a----b', {
                a: actions.midnightSync.requestResync(),
                b: actions.midnightSync.requestResync(),
              }),
            },
          },
          stateObservables: {
            wallets: {
              selectIsWalletRepoMigrating$: hot('a', { a: false }),
              // Accounts don't change throughout the test
              selectActiveNetworkAccounts$: hot('a', { a: allAccounts }),
            },
            midnightContext: {
              // Frame 0: undeployed, Frame 5: switches to preview
              selectMidnightBlockchainNetworkId$: hot('a----b', {
                a: MidnightNetworkId(networkId), // Undeployed
                b: MidnightNetworkId(previewNetworkId), // Preview
              }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            // Frame 2: resync uses undeployed account (network was undeployed at frame 0)
            // Frame 7: resync uses preview account (network switched to preview at frame 5)
            expectObservable(sideEffect$).toBe('--(ab)-(cd)', {
              a: actions.sync.addSyncOperation({
                accountId, // Undeployed account
                operation: expect.objectContaining({
                  operationId: `${accountId}-midnight-sync`,
                  status: 'Pending',
                  description: 'sync.operation.midnight-resync',
                }) as never,
              }),
              b: actions.midnightSync.resync(),
              c: actions.sync.addSyncOperation({
                accountId: previewAccountId, // Preview account
                operation: expect.objectContaining({
                  operationId: `${previewAccountId}-midnight-sync`,
                  status: 'Pending',
                  description: 'sync.operation.midnight-resync',
                }) as never,
              }),
              d: actions.midnightSync.resync(),
            });
          },
        };
      });
    });
  });
});
