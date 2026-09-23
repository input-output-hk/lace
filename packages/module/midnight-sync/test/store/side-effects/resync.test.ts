import { activitiesActions } from '@lace-contract/activities';
import { addressesActions } from '@lace-contract/addresses';
import { appActions } from '@lace-contract/app';
import {
  EMPTY_PARTIAL_NETWORKS_CONFIG,
  midnightContextActions,
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
import { of, throwError } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { midnightSyncActions } from '../../../src/store/actions';
import {
  createClearWalletStateOnResync,
  createDeleteWalletSideEffect,
  createResetSyncStateSideEffect,
  requestResyncWallet,
  resyncWalletOnConfigChangeFromFeatureFlags,
} from '../../../src/store/side-effects/resync';

import type { SerializedMidnightWallet } from '@lace-contract/midnight-context';
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

describe('midnight-sync/store/side-effects', () => {
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
                      proofServerAddress: 'http://proofServerAddress',
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
                      proofServerAddress: 'http://proofServerAddress',
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
                      proofServerAddress: 'http://proofServerAddress',
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
