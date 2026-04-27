import { Cardano } from '@cardano-sdk/core';
import { type AnyAddress } from '@lace-contract/addresses';
import { type Failure } from '@lace-contract/failures';
import { syncActions } from '@lace-contract/sync';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it } from 'vitest';

import { coordinateCardanoSync } from '../../../src/store/side-effects/coordinate-sync';
import { cardanoContextActions } from '../../../src/store/slice';
import { CardanoSyncFailureId } from '../../../src/value-objects';
import {
  midnightAccount,
  midnightAddress,
  previewAccountCardanoWalletAccounts,
  threeAccountCardanoWalletAccounts,
} from '../../mocks';

import type { FailureId } from '@lace-contract/failures';
import type { SyncOperationId } from '@lace-contract/sync';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Timestamp } from '@lace-sdk/util';

const actions = {
  ...syncActions,
  ...cardanoContextActions,
};

describe('coordinateCardanoSync', () => {
  it('should start sync round with address discovery for new accounts', () => {
    testSideEffect(coordinateCardanoSync, ({ hot, expectObservable }) => {
      const accounts$ = hot<AnyAccount[]>('a', {
        a: [threeAccountCardanoWalletAccounts[0]],
      });
      const addresses$ = hot<AnyAddress[]>('a', { a: [] });
      const tip$ = hot<Cardano.PartialBlockHeader | undefined>('a', {
        a: { hash: 'tip-hash-123' } as Cardano.PartialBlockHeader,
      });
      const isAccountSyncing$ = hot('a', {
        a: (_accountId: AccountId) => false,
      });
      const selectIsSyncOperationPending$ = hot('a', {
        a: (_opId: SyncOperationId) => false, // Operations complete immediately
      });
      const chainId$ = hot<Cardano.ChainId>('a', {
        a: Cardano.ChainIds.Preprod,
      });
      const selectAllFailures$ = hot<Record<FailureId, Failure>>('a', {
        a: {},
      });
      const retrySyncRound$ = hot<
        ReturnType<typeof actions.cardanoContext.retrySyncRound>
      >('-', {}); // Never emits

      const accountId = threeAccountCardanoWalletAccounts[0].accountId;
      const syncRoundId = `${accountId}-tip-hash-123`;

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          cardanoContext: { selectTip$: tip$, selectChainId$: chainId$ },
          sync: {
            selectIsAccountSyncing$: isAccountSyncing$,
            selectIsSyncOperationPending$,
          },
          failures: { selectAllFailures$ },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.sync.addSyncOperation({
              accountId,
              operation: {
                operationId: `${syncRoundId}-address-discovery`,
                status: 'Pending',
                description: 'sync.operation.address-discovery',
                startedAt: expect.any(Number) as unknown as Timestamp,
              },
            }),
          });
        },
      };
    });
  });

  it('should use tip hash in operation IDs', () => {
    testSideEffect(coordinateCardanoSync, ({ hot, expectObservable }) => {
      const accountId = threeAccountCardanoWalletAccounts[0].accountId;
      const accounts$ = hot<AnyAccount[]>('a', {
        a: [threeAccountCardanoWalletAccounts[0]],
      });
      const addresses$ = hot<AnyAddress[]>('a', { a: [] });
      const tipHash = 'specific-tip-hash';
      const tip$ = hot<Cardano.PartialBlockHeader | undefined>('a', {
        a: { hash: tipHash } as Cardano.PartialBlockHeader,
      });
      const isAccountSyncing$ = hot('a', {
        a: (_: AccountId) => false,
      });
      const selectIsSyncOperationPending$ = hot('a', {
        a: (_opId: SyncOperationId) => false,
      });
      const chainId$ = hot<Cardano.ChainId>('a', {
        a: Cardano.ChainIds.Preprod,
      });
      const selectAllFailures$ = hot<Record<FailureId, Failure>>('a', {
        a: {},
      });
      const retrySyncRound$ = hot<
        ReturnType<typeof actions.cardanoContext.retrySyncRound>
      >('-', {}); // Never emits

      const syncRoundId = `${accountId}-${tipHash}`;

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          cardanoContext: { selectTip$: tip$, selectChainId$: chainId$ },
          sync: {
            selectIsAccountSyncing$: isAccountSyncing$,
            selectIsSyncOperationPending$,
          },
          failures: { selectAllFailures$ },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.sync.addSyncOperation({
              accountId,
              operation: {
                operationId: `${syncRoundId}-address-discovery`,
                status: 'Pending',
                description: 'sync.operation.address-discovery',
                startedAt: expect.any(Number) as unknown as Timestamp,
              },
            }),
          });
        },
      };
    });
  });

  it('should skip midnight accounts and only process cardano accounts', () => {
    testSideEffect(coordinateCardanoSync, ({ hot, expectObservable }) => {
      const accounts$ = hot<AnyAccount[]>('a', {
        a: [midnightAccount, threeAccountCardanoWalletAccounts[0]],
      });
      const addresses$ = hot<AnyAddress[]>('a', {
        a: [midnightAddress],
      });
      const tip$ = hot<Cardano.PartialBlockHeader | undefined>('a', {
        a: { hash: 'tip-hash' } as Cardano.PartialBlockHeader,
      });
      const isAccountSyncing$ = hot('a', {
        a: (_: AccountId) => false,
      });
      const selectIsSyncOperationPending$ = hot('a', {
        a: (_opId: SyncOperationId) => false,
      });
      const chainId$ = hot<Cardano.ChainId>('a', {
        a: Cardano.ChainIds.Preprod,
      });
      const selectAllFailures$ = hot<Record<FailureId, Failure>>('a', {
        a: {},
      });
      const retrySyncRound$ = hot<
        ReturnType<typeof actions.cardanoContext.retrySyncRound>
      >('-', {}); // Never emits

      const accountId = threeAccountCardanoWalletAccounts[0].accountId;
      const syncRoundId = `${accountId}-tip-hash`;

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          cardanoContext: { selectTip$: tip$, selectChainId$: chainId$ },
          sync: {
            selectIsAccountSyncing$: isAccountSyncing$,
            selectIsSyncOperationPending$,
          },
          failures: { selectAllFailures$ },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          // Should only emit actions for cardano account, not midnight
          expectObservable(sideEffect$).toBe('a', {
            a: actions.sync.addSyncOperation({
              accountId,
              operation: {
                operationId: `${syncRoundId}-address-discovery`,
                status: 'Pending',
                description: 'sync.operation.address-discovery',
                startedAt: expect.any(Number) as unknown as Timestamp,
              },
            }),
          });
        },
      };
    });
  });

  it('should not process new coordination while previous one is in progress (exhaustMap behavior)', () => {
    testSideEffect(coordinateCardanoSync, ({ hot, expectObservable }) => {
      const accountId = threeAccountCardanoWalletAccounts[0].accountId;
      const accounts$ = hot<AnyAccount[]>('a', {
        a: [threeAccountCardanoWalletAccounts[0]],
      });
      const addresses$ = hot<AnyAddress[]>('a', { a: [] });
      // Rapid tip changes: tip-1 at frame 0, tip-2 at frame 1
      const tip$ = hot<Cardano.PartialBlockHeader | undefined>('ab', {
        a: { hash: 'tip-hash-1' } as Cardano.PartialBlockHeader,
        b: { hash: 'tip-hash-2' } as Cardano.PartialBlockHeader,
      });
      const isAccountSyncing$ = hot('a', {
        a: (_: AccountId) => false,
      });
      // Simulate operations staying pending (never complete during test)
      const selectIsSyncOperationPending$ = hot('a', {
        a: (_opId: SyncOperationId) => true,
      });
      const chainId$ = hot<Cardano.ChainId>('a', {
        a: Cardano.ChainIds.Preprod,
      });
      const selectAllFailures$ = hot<Record<FailureId, Failure>>('a', {
        a: {},
      });
      const retrySyncRound$ = hot<
        ReturnType<typeof actions.cardanoContext.retrySyncRound>
      >('-', {}); // Never emits

      const syncRoundId1 = `${accountId}-tip-hash-1`;

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          cardanoContext: { selectTip$: tip$, selectChainId$: chainId$ },
          sync: {
            selectIsAccountSyncing$: isAccountSyncing$,
            selectIsSyncOperationPending$,
          },
          failures: { selectAllFailures$ },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          // With exhaustMap, should only process first emission (tip-hash-1) at frame 0
          // Second emission (tip-hash-2) at frame 1 should be ignored because
          // the inner observable is still waiting for operations to complete
          expectObservable(sideEffect$).toBe('a', {
            a: actions.sync.addSyncOperation({
              accountId,
              operation: {
                operationId: `${syncRoundId1}-address-discovery`,
                status: 'Pending',
                description: 'sync.operation.address-discovery',
                startedAt: expect.any(Number) as unknown as Timestamp,
              },
            }),
          });
        },
      };
    });
  });

  it('should only coordinate sync for accounts on currently active chain', () => {
    testSideEffect(coordinateCardanoSync, ({ hot, expectObservable }) => {
      // Mix of Preprod (active) and Preview (inactive) accounts
      const accounts$ = hot<AnyAccount[]>('a', {
        a: [
          threeAccountCardanoWalletAccounts[0], // Preprod
          previewAccountCardanoWalletAccounts[0], // Preview
          threeAccountCardanoWalletAccounts[1], // Preprod
        ],
      });
      const addresses$ = hot<AnyAddress[]>('a', { a: [] });
      const tip$ = hot<Cardano.PartialBlockHeader | undefined>('a', {
        a: { hash: 'tip-hash-123' } as Cardano.PartialBlockHeader,
      });
      const isAccountSyncing$ = hot('a', {
        a: (_accountId: AccountId) => false,
      });
      const selectIsSyncOperationPending$ = hot('a', {
        a: (_opId: SyncOperationId) => false,
      });
      // Active chain is Preprod
      const selectAllFailures$ = hot<Record<FailureId, Failure>>('a', {
        a: {},
      });

      const retrySyncRound$ = hot<
        ReturnType<typeof actions.cardanoContext.retrySyncRound>
      >('-', {}); // Never emits

      const chainId$ = hot<Cardano.ChainId>('a', {
        a: Cardano.ChainIds.Preprod,
      });

      const account0Id = threeAccountCardanoWalletAccounts[0].accountId;
      const account1Id = threeAccountCardanoWalletAccounts[1].accountId;
      const syncRound0Id = `${account0Id}-tip-hash-123`;
      const syncRound1Id = `${account1Id}-tip-hash-123`;

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          cardanoContext: { selectTip$: tip$, selectChainId$: chainId$ },
          sync: {
            selectIsAccountSyncing$: isAccountSyncing$,
            selectIsSyncOperationPending$,
          },
          failures: { selectAllFailures$ },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          // Should only emit actions for Preprod accounts (account0 and account1)
          // Preview account should be filtered out
          expectObservable(sideEffect$).toBe('(ac)', {
            a: actions.sync.addSyncOperation({
              accountId: account0Id,
              operation: {
                operationId: `${syncRound0Id}-address-discovery`,
                status: 'Pending',
                description: 'sync.operation.address-discovery',
                startedAt: expect.any(Number) as unknown as Timestamp,
              },
            }),
            c: actions.sync.addSyncOperation({
              accountId: account1Id,
              operation: {
                operationId: `${syncRound1Id}-address-discovery`,
                status: 'Pending',
                description: 'sync.operation.address-discovery',
                startedAt: expect.any(Number) as unknown as Timestamp,
              },
            }),
          });
        },
      };
    });
  });

  describe('manual retry', () => {
    it('should retry sync only for accounts with failures', () => {
      testSideEffect(coordinateCardanoSync, ({ hot, flush }) => {
        const account0Id = threeAccountCardanoWalletAccounts[0].accountId;
        const account1Id = threeAccountCardanoWalletAccounts[1].accountId;

        // All observables emit at frame 0
        const accounts$ = hot<AnyAccount[]>('a', {
          a: [
            threeAccountCardanoWalletAccounts[0],
            threeAccountCardanoWalletAccounts[1],
          ],
        });
        // Neither account has addresses - both need address discovery
        const addresses$ = hot<AnyAddress[]>('a', {
          a: [],
        });
        const tip$ = hot<Cardano.PartialBlockHeader | undefined>('a', {
          a: { hash: 'tip-hash-retry' } as Cardano.PartialBlockHeader,
        });
        // Make operations complete immediately after becoming pending
        // First check sees pending, second check sees complete
        const selectIsSyncOperationPending$ = hot('aabbbbbbbb', {
          a: (_opId: SyncOperationId): boolean => true,
          b: (_opId: SyncOperationId): boolean => false,
        });
        const chainId$ = hot<Cardano.ChainId>('a', {
          a: Cardano.ChainIds.Preprod,
        });

        // Only account0 has a failure
        const allFailures: Record<FailureId, Failure> = {
          [CardanoSyncFailureId(account0Id)]: {
            failureId: CardanoSyncFailureId(account0Id),
            message: 'sync.error.cardano-sync-round-failed',
          },
        };
        const selectAllFailures$ = hot<Record<FailureId, Failure>>('a', {
          a: allFailures,
        });

        // Manual retry at frame 5 (after natural trigger completes)
        const retrySyncRound$ = hot('-----a', {
          a: actions.cardanoContext.retrySyncRound(),
        });

        const syncRoundId0 = `${account0Id}-tip-hash-retry`;
        const syncRoundId1 = `${account1Id}-tip-hash-retry`;

        return {
          actionObservables: {
            cardanoContext: { retrySyncRound$ },
          },
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            addresses: { selectAllAddresses$: addresses$ },
            cardanoContext: { selectTip$: tip$, selectChainId$: chainId$ },
            sync: { selectIsSyncOperationPending$ },
            failures: { selectAllFailures$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            // Natural trigger syncs both accounts, then manual retry syncs only account0
            const emissions: Array<
              ReturnType<typeof actions.sync.addSyncOperation>
            > = [];
            sideEffect$.subscribe(action => {
              if (action.type === 'sync/addSyncOperation') {
                emissions.push(
                  action as ReturnType<typeof actions.sync.addSyncOperation>,
                );
              }
            });
            flush();

            // Should have 3 emissions:
            // - Natural trigger: account0 address-discovery, account1 address-discovery
            // - Manual retry: account0 address-discovery only (the one with failure)
            expect(emissions.length).toBe(3);

            // First two are from natural trigger (both accounts)
            const accountIds = emissions
              .slice(0, 2)
              .map(emission => emission.payload.accountId);
            expect(accountIds).toContain(account0Id);
            expect(accountIds).toContain(account1Id);
            expect(emissions[0].payload.operation.operationId).toBe(
              `${syncRoundId0}-address-discovery`,
            );
            expect(emissions[1].payload.operation.operationId).toBe(
              `${syncRoundId1}-address-discovery`,
            );

            // Third is from manual retry (only account0 with failure)
            expect(emissions[2].payload.accountId).toBe(account0Id);
            expect(emissions[2].payload.operation.operationId).toBe(
              `${syncRoundId0}-address-discovery`,
            );
          },
        };
      });
    });

    it('should not emit actions from manual retry when no failures exist', () => {
      testSideEffect(coordinateCardanoSync, ({ hot, expectObservable }) => {
        const account0Id = threeAccountCardanoWalletAccounts[0].accountId;

        // All observables emit at frame 0
        const accounts$ = hot<AnyAccount[]>('a', {
          a: [threeAccountCardanoWalletAccounts[0]],
        });
        // Account has no addresses - needs address discovery
        const addresses$ = hot<AnyAddress[]>('a', {
          a: [],
        });
        const tip$ = hot<Cardano.PartialBlockHeader | undefined>('a', {
          a: { hash: 'tip-hash-retry' } as Cardano.PartialBlockHeader,
        });
        // Natural trigger completes quickly
        // Continue emitting false for long enough to allow manual retry to fire
        const selectIsSyncOperationPending$ = hot('abbbbbbbbb', {
          a: (_opId: SyncOperationId): boolean => true,
          b: (_opId: SyncOperationId): boolean => false,
        });
        const chainId$ = hot<Cardano.ChainId>('a', {
          a: Cardano.ChainIds.Preprod,
        });

        // No failures
        const selectAllFailures$ = hot<Record<FailureId, Failure>>('a', {
          a: {},
        });

        // Manual retry at frame 2
        const retrySyncRound$ = hot('--a', {
          a: actions.cardanoContext.retrySyncRound(),
        });

        const syncRoundId = `${account0Id}-tip-hash-retry`;

        return {
          actionObservables: {
            cardanoContext: { retrySyncRound$ },
          },
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            addresses: { selectAllAddresses$: addresses$ },
            cardanoContext: { selectTip$: tip$, selectChainId$: chainId$ },
            sync: { selectIsSyncOperationPending$ },
            failures: { selectAllFailures$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            // Frame 0: Natural trigger syncs account0 with address-discovery
            // Frame 2: Manual retry finds no failures, emits nothing
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.addSyncOperation({
                accountId: account0Id,
                operation: {
                  operationId: `${syncRoundId}-address-discovery`,
                  status: 'Pending',
                  description: 'sync.operation.address-discovery',
                  startedAt: expect.any(Number) as unknown as Timestamp,
                },
              }),
            });
          },
        };
      });
    });

    it('should retry all accounts that have failures', () => {
      testSideEffect(coordinateCardanoSync, ({ hot, expectObservable }) => {
        const account0Id = threeAccountCardanoWalletAccounts[0].accountId;
        const account1Id = threeAccountCardanoWalletAccounts[1].accountId;

        // Delay all state observables to frame 1
        const accounts$ = hot<AnyAccount[]>('-a', {
          a: [
            threeAccountCardanoWalletAccounts[0],
            threeAccountCardanoWalletAccounts[1],
          ],
        });
        const addresses$ = hot<AnyAddress[]>('-a', { a: [] });
        const tip$ = hot<Cardano.PartialBlockHeader | undefined>('-a', {
          a: { hash: 'tip-hash-parse' } as Cardano.PartialBlockHeader,
        });
        const selectIsSyncOperationPending$ = hot('-a', {
          a: (_opId: SyncOperationId) => false,
        });
        const chainId$ = hot<Cardano.ChainId>('-a', {
          a: Cardano.ChainIds.Preprod,
        });

        // Both accounts have failures
        const allFailures: Record<FailureId, Failure> = {
          [CardanoSyncFailureId(account0Id)]: {
            failureId: CardanoSyncFailureId(account0Id),
            message: 'sync.error.cardano-sync-round-failed',
          },
          [CardanoSyncFailureId(account1Id)]: {
            failureId: CardanoSyncFailureId(account1Id),
            message: 'sync.error.cardano-sync-round-failed',
          },
        };
        const selectAllFailures$ = hot<Record<FailureId, Failure>>('-a', {
          a: allFailures,
        });

        // Manual retry action at frame 1
        const retrySyncRound$ = hot('-a', {
          a: actions.cardanoContext.retrySyncRound(),
        });

        const syncRound0Id = `${account0Id}-tip-hash-parse`;
        const syncRound1Id = `${account1Id}-tip-hash-parse`;

        return {
          actionObservables: {
            cardanoContext: { retrySyncRound$ },
          },
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            addresses: { selectAllAddresses$: addresses$ },
            cardanoContext: { selectTip$: tip$, selectChainId$: chainId$ },
            sync: { selectIsSyncOperationPending$ },
            failures: { selectAllFailures$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            // Should retry both accounts with failures
            expectObservable(sideEffect$).toBe('-(ab)', {
              a: actions.sync.addSyncOperation({
                accountId: account0Id,
                operation: {
                  operationId: `${syncRound0Id}-address-discovery`,
                  status: 'Pending',
                  description: 'sync.operation.address-discovery',
                  startedAt: expect.any(Number) as unknown as Timestamp,
                },
              }),
              b: actions.sync.addSyncOperation({
                accountId: account1Id,
                operation: {
                  operationId: `${syncRound1Id}-address-discovery`,
                  status: 'Pending',
                  description: 'sync.operation.address-discovery',
                  startedAt: expect.any(Number) as unknown as Timestamp,
                },
              }),
            });
          },
        };
      });
    });
  });
});
