import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { addressesActions } from '@lace-contract/addresses';
import {
  CardanoPaymentAddress,
  CardanoRewardAccount,
  cardanoContextActions,
  toContractAddress,
} from '@lace-contract/cardano-context';
import {
  cardanoCustodyAccount,
  custodyAddress,
  custodyRewardAccount,
  foreignPaymentAddress,
  observerCustodyAccount,
} from '@lace-contract/cardano-context/test/custody-mocks';
import {
  cardanoAccount0Addr,
  threeAccountCardanoWalletAccounts,
} from '@lace-contract/cardano-context/test/mocks';
import { multiSigAccount as scriptAccount } from '@lace-contract/cardano-context/test/multisig-mocks';
import { BlockchainNetworkId } from '@lace-contract/network';
import { syncActions } from '@lace-contract/sync';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-lib/util';
import { Err, Ok } from '@lace-lib/util';
import { testSideEffect as baseTestSideEffect } from '@lace-lib/util-dev';
import { of } from 'rxjs';
import { NEVER } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import * as getScriptAddressModule from '../../../src/store/get-script-address';
import { addressDiscoverySync } from '../../../src/store/side-effects/address-discovery-sync';

import type { CardanoSyncAction } from '../../../src';
import type { Selectors, ActionCreators } from '../../../src/module';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoProviderDependencies,
  CardanoAddressData,
  DiscoverAddressesProps,
} from '@lace-contract/cardano-context';
import type { TranslationKey } from '@lace-contract/i18n';
import type { SyncOperation } from '@lace-contract/sync';
import type {
  AnyAccount,
  MultiSigWalletAccount,
} from '@lace-contract/wallet-repo';
import type { RunHelpers } from 'rxjs/testing';

const testSideEffect: typeof baseTestSideEffect<Selectors, ActionCreators> = (
  effect,
  setup,
) => {
  baseTestSideEffect(effect, helpers => {
    const config = setup(helpers);
    return {
      ...config,
      actionObservables: {
        ...config.actionObservables,
        sync: {
          failSyncOperation$: NEVER,
          clearPendingSyncsForAccounts$: NEVER,
          ...config.actionObservables?.sync,
        },
        cardanoContext: {
          resetWalletSyncState$: NEVER,
          refetchAccountUtxos$: NEVER,
          setWalletSyncResetResult$: NEVER,
          ...config.actionObservables?.cardanoContext,
        },
      },
    };
  });
};

const actions = {
  ...syncActions,
  ...addressesActions,
  ...cardanoContextActions,
};

describe('addressDiscoverySync', () => {
  it('marks operation as InProgress on start, upserts addresses, chains transaction-polling on the same round, and completes on success', () => {
    testSideEffect(addressDiscoverySync, ({ cold, hot, expectObservable }) => {
      const accountId = threeAccountCardanoWalletAccounts[0].accountId;
      const tipHash = 'tip-hash';
      const operationId = `${accountId}-${tipHash}-address-discovery`;
      const operation: SyncOperation = {
        operationId,
        status: 'Pending',
        description: 'sync.operation.address-discovery',
        startedAt: Timestamp(Date.now()),
      };

      const addSyncOperation$ = hot('a', {
        a: actions.sync.addSyncOperation({ accountId, operation }),
      });

      const accounts$ = hot<AnyAccount[]>('a', {
        a: [threeAccountCardanoWalletAccounts[0]],
      });

      const discoverAddresses = vi
        .fn()
        .mockImplementation((_props: DiscoverAddressesProps) => {
          return cold('-a|', { a: Ok(cardanoAccount0Addr) });
        });

      return {
        actionObservables: {
          sync: { addSyncOperation$: addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
        },
        dependencies: {
          cardanoProvider: {
            discoverAddresses,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a-(bcd)', {
            a: actions.sync.updateSyncOperation({
              accountId,
              operationId,
              update: {
                status: 'InProgress',
                type: 'Indeterminate',
              },
            }),
            b: actions.addresses.upsertAddresses({
              blockchainName: 'Cardano',
              accountId,
              addresses: [cardanoAccount0Addr],
            }),
            c: actions.sync.addSyncOperation({
              accountId,
              operation: {
                operationId: `${accountId}-${tipHash}-transaction-polling`,
                status: 'Pending',
                description: 'sync.operation.transaction-polling',
                startedAt: expect.any(Number) as unknown as Timestamp,
              },
            }),
            d: actions.sync.completeSyncOperation({
              accountId,
              operationId,
            }),
          });
        },
      };
    });
  });

  it.each(['network', 'reset'])(
    'cancels discovery before it can write after %s abandonment',
    reason => {
      testSideEffect(addressDiscoverySync, ({ cold, hot, flush }) => {
        const accountId = threeAccountCardanoWalletAccounts[0].accountId;
        const tipHash = 'tip-hash';
        const operationId = `${accountId}-${tipHash}-address-discovery`;
        const operation: SyncOperation = {
          operationId,
          status: 'Pending',
          description: 'sync.operation.address-discovery',
          startedAt: Timestamp(Date.now()),
        };

        const addSyncOperation$ = hot('a', {
          a: actions.sync.addSyncOperation({ accountId, operation }),
        });

        // Account is on the active network at subscribe (so discovery starts),
        // then a network switch drops it from the active set at frame 3 — before
        // discovery resolves at frame 6. `takeUntil` must cancel the in-flight
        // discovery so it never reaches upsertAddresses / chained polling /
        // completeSyncOperation.
        const accounts$ = hot<AnyAccount[]>('a--b', {
          a: [threeAccountCardanoWalletAccounts[0]],
          b: reason === 'network' ? [] : [threeAccountCardanoWalletAccounts[0]],
        });

        const discoverAddresses = vi
          .fn()
          .mockImplementation((_props: DiscoverAddressesProps) =>
            cold('------a|', { a: Ok(cardanoAccount0Addr) }),
          );

        return {
          actionObservables: {
            sync: {
              addSyncOperation$: addSyncOperation$,
              clearPendingSyncsForAccounts$:
                reason === 'reset'
                  ? hot('---a', {
                      a: actions.sync.clearPendingSyncsForAccounts({
                        accountIds: [accountId],
                      }),
                    })
                  : NEVER,
            },
          },
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
          },
          dependencies: {
            cardanoProvider: {
              discoverAddresses,
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            const emissions: CardanoSyncAction[] = [];
            sideEffect$.subscribe(action => emissions.push(action));
            flush();

            // Only InProgress — discovery is cancelled by takeUntil.
            expect(emissions).toEqual([
              actions.sync.updateSyncOperation({
                accountId,
                operationId,
                update: {
                  status: 'InProgress',
                  type: 'Indeterminate',
                },
              }),
            ]);
          },
        };
      });
    },
  );

  it('should succeed when address discovery succeeds immediately', () => {
    // Note: Full retry behavior (exponential backoff timing) is tested in integration tests
    // This test verifies the happy path with retryBackoff operator applied
    testSideEffect(addressDiscoverySync, ({ cold, hot, expectObservable }) => {
      const accountId = threeAccountCardanoWalletAccounts[0].accountId;
      const tipHash = 'tip-hash';
      const operationId = `${accountId}-${tipHash}-address-discovery`;
      const operation: SyncOperation = {
        operationId,
        status: 'Pending',
        description: 'sync.operation.address-discovery',
        startedAt: Timestamp(Date.now()),
      };

      const addSyncOperation$ = hot('a', {
        a: actions.sync.addSyncOperation({ accountId, operation }),
      });

      const accounts$ = hot<AnyAccount[]>('a', {
        a: [threeAccountCardanoWalletAccounts[0]],
      });

      // Succeed immediately (no retry needed)
      const discoverAddresses = vi
        .fn()
        .mockImplementation((_props: DiscoverAddressesProps) => {
          return cold('-a|', { a: Ok(cardanoAccount0Addr) });
        });

      return {
        actionObservables: {
          sync: { addSyncOperation$: addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
        },
        dependencies: {
          cardanoProvider: {
            discoverAddresses,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          // Same behavior as success test - transparent retry doesn't change happy path
          expectObservable(sideEffect$).toBe('a-(bcd)', {
            a: actions.sync.updateSyncOperation({
              accountId,
              operationId,
              update: {
                status: 'InProgress',
                type: 'Indeterminate',
              },
            }),
            b: actions.addresses.upsertAddresses({
              blockchainName: 'Cardano',
              accountId,
              addresses: [cardanoAccount0Addr],
            }),
            c: actions.sync.addSyncOperation({
              accountId,
              operation: {
                operationId: `${accountId}-${tipHash}-transaction-polling`,
                status: 'Pending',
                description: 'sync.operation.transaction-polling',
                startedAt: expect.any(Number) as unknown as Timestamp,
              },
            }),
            d: actions.sync.completeSyncOperation({
              accountId,
              operationId,
            }),
          });
        },
      };
    });
  });

  it('should fail operation when discovery fails after exhausting retries', () => {
    testSideEffect(addressDiscoverySync, ({ cold, hot, flush }) => {
      const accountId = threeAccountCardanoWalletAccounts[0].accountId;
      const operationId = `${accountId}-tip-hash-address-discovery`;
      const operation: SyncOperation = {
        operationId,
        status: 'Pending',
        description: 'sync.operation.address-discovery',
        startedAt: Timestamp(Date.now()),
      };

      const addSyncOperation$ = hot('a', {
        a: actions.sync.addSyncOperation({ accountId, operation }),
      });

      const accounts$ = hot<AnyAccount[]>('a', {
        a: [threeAccountCardanoWalletAccounts[0]],
      });

      const error = new ProviderError(ProviderFailure.ConnectionFailure);
      const discoverAddresses = vi
        .fn()
        .mockImplementation((_props: DiscoverAddressesProps) => {
          return cold('-a|', { a: Err(error) });
        });

      return {
        actionObservables: {
          sync: { addSyncOperation$: addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
        },
        dependencies: {
          cardanoProvider: {
            discoverAddresses,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          // Collect emissions to verify failure occurs after retries
          const emissions: CardanoSyncAction[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          // Should emit update (InProgress) first, then fail after retries exhausted
          expect(emissions.length).toBe(2);
          expect(emissions[0]).toEqual(
            actions.sync.updateSyncOperation({
              accountId,
              operationId,
              update: {
                status: 'InProgress',
                type: 'Indeterminate',
              },
            }),
          );
          expect(emissions[1]).toEqual(
            actions.sync.failSyncOperation({
              accountId,
              operationId,
              error: 'sync.error.address-discovery-failed',
            }),
          );
        },
      };
    });
  });

  it('should retry 3 times with exponential backoff before failing', () => {
    testSideEffect(addressDiscoverySync, ({ cold, hot, expectObservable }) => {
      const accountId = threeAccountCardanoWalletAccounts[0].accountId;
      const operationId = `${accountId}-tip-hash-address-discovery`;
      const operation: SyncOperation = {
        operationId,
        status: 'Pending',
        description: 'sync.operation.address-discovery',
        startedAt: Timestamp(Date.now()),
      };

      const addSyncOperation$ = hot('a', {
        a: actions.sync.addSyncOperation({ accountId, operation }),
      });

      const accounts$ = hot<AnyAccount[]>('a', {
        a: [threeAccountCardanoWalletAccounts[0]],
      });

      const error = new ProviderError(ProviderFailure.ConnectionFailure);
      const discoverAddresses = vi.fn().mockReturnValue(cold('-#', {}, error));

      return {
        actionObservables: {
          sync: { addSyncOperation$: addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
        },
        dependencies: {
          cardanoProvider: {
            discoverAddresses,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          // retryBackoff with 3 retries: 300ms + 600ms + 1200ms = 2100ms
          // Each cold('-#') adds 1 frame before error (4 times: initial + 3 retries = 4ms)
          // Space takes 1 frame, so: 2100ms base + 4ms overhead - 1ms space = 2103ms
          expectObservable(sideEffect$).toBe('a 2103ms b', {
            a: actions.sync.updateSyncOperation({
              accountId,
              operationId,
              update: {
                status: 'InProgress',
                type: 'Indeterminate',
              },
            }),
            b: actions.sync.failSyncOperation({
              accountId,
              operationId,
              error: 'sync.error.address-discovery-failed',
            }),
          });
        },
      };
    });
  });

  it('should skip operations that are not pending', () => {
    testSideEffect(addressDiscoverySync, ({ hot, expectObservable }) => {
      const accountId = threeAccountCardanoWalletAccounts[0].accountId;
      const operationId = `${accountId}-tip-hash-address-discovery`;
      const operation: SyncOperation = {
        operationId,
        status: 'InProgress',
        type: 'Indeterminate',
        description: 'sync.operation.address-discovery',
        startedAt: Timestamp(Date.now()),
      };

      const addSyncOperation$ = hot('a', {
        a: actions.sync.addSyncOperation({ accountId, operation }),
      });

      const accounts$ = hot<AnyAccount[]>('a', {
        a: [threeAccountCardanoWalletAccounts[0]],
      });

      return {
        actionObservables: {
          sync: { addSyncOperation$: addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
        },
        dependencies: {
          cardanoProvider:
            {} as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          // Should emit nothing because operation is not pending
          expectObservable(sideEffect$).toBe('-');
        },
      };
    });
  });

  it('should skip operations that do not end with -address-discovery', () => {
    testSideEffect(addressDiscoverySync, ({ hot, expectObservable }) => {
      const accountId = threeAccountCardanoWalletAccounts[0].accountId;
      const operationId = `${accountId}-tip-hash-tokens`;
      const operation: SyncOperation = {
        operationId,
        status: 'Pending',
        description: 'sync.operation.tokens',
        startedAt: Timestamp(Date.now()),
      };

      const addSyncOperation$ = hot('a', {
        a: actions.sync.addSyncOperation({ accountId, operation }),
      });

      const accounts$ = hot<AnyAccount[]>('a', {
        a: [threeAccountCardanoWalletAccounts[0]],
      });

      return {
        actionObservables: {
          sync: { addSyncOperation$: addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
        },
        dependencies: {
          cardanoProvider:
            {} as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          // Should emit nothing because operation ID doesn't end with -address-discovery
          expectObservable(sideEffect$).toBe('-');
        },
      };
    });
  });

  it('should process multiple operations concurrently without cancelling (mergeMap behavior)', () => {
    testSideEffect(addressDiscoverySync, ({ cold, hot, flush }) => {
      const account1Id = threeAccountCardanoWalletAccounts[0].accountId;
      const account2Id = threeAccountCardanoWalletAccounts[1].accountId;
      const tipHash1 = 'tip-hash-1';
      const tipHash2 = 'tip-hash-2';
      const op1Id = `${account1Id}-${tipHash1}-address-discovery`;
      const op2Id = `${account2Id}-${tipHash2}-address-discovery`;

      const operation1: SyncOperation = {
        operationId: op1Id,
        status: 'Pending',
        description: 'sync.operation.address-discovery',
        startedAt: Timestamp(Date.now()),
      };

      const operation2: SyncOperation = {
        operationId: op2Id,
        status: 'Pending',
        description: 'sync.operation.address-discovery',
        startedAt: Timestamp(Date.now()),
      };

      // Emit operations at frame 0 and frame 1
      const addSyncOperation$ = hot('ab', {
        a: actions.sync.addSyncOperation({
          accountId: account1Id,
          operation: operation1,
        }),
        b: actions.sync.addSyncOperation({
          accountId: account2Id,
          operation: operation2,
        }),
      });

      // Use cold to simulate selector behavior - emits on each subscription
      const accounts$ = cold<AnyAccount[]>('a', {
        a: threeAccountCardanoWalletAccounts,
      });

      let callCount = 0;
      const discoverAddresses = vi
        .fn()
        .mockImplementation((_props: DiscoverAddressesProps) => {
          callCount++;
          // First call (op1): takes 3 frames
          // Second call (op2): takes 6 frames
          const delay = callCount === 1 ? '---a|' : '------a|';
          return cold(delay, { a: Ok(cardanoAccount0Addr) });
        });

      return {
        actionObservables: {
          sync: { addSyncOperation$: addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
        },
        dependencies: {
          cardanoProvider: {
            discoverAddresses,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          // Each completion now emits 3 actions (upsert + addSyncOperation(polling)
          // + completeSyncOperation). The 5-char parenthesized groups overlap
          // with op2's completion frame in marble notation, so use flush()
          // + programmatic assertions instead.
          const emissions: CardanoSyncAction[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(emissions).toEqual([
            // Frame 0: op1 InProgress
            actions.sync.updateSyncOperation({
              accountId: account1Id,
              operationId: op1Id,
              update: { status: 'InProgress', type: 'Indeterminate' },
            }),
            // Frame 1: op2 InProgress
            actions.sync.updateSyncOperation({
              accountId: account2Id,
              operationId: op2Id,
              update: { status: 'InProgress', type: 'Indeterminate' },
            }),
            // Frame 3: op1 completion group
            actions.addresses.upsertAddresses({
              blockchainName: 'Cardano',
              accountId: account1Id,
              addresses: [cardanoAccount0Addr],
            }),
            actions.sync.addSyncOperation({
              accountId: account1Id,
              operation: {
                operationId: `${account1Id}-${tipHash1}-transaction-polling`,
                status: 'Pending',
                description: 'sync.operation.transaction-polling',
                startedAt: expect.any(Number) as unknown as Timestamp,
              },
            }),
            actions.sync.completeSyncOperation({
              accountId: account1Id,
              operationId: op1Id,
            }),
            // Frame 7: op2 completion group
            actions.addresses.upsertAddresses({
              blockchainName: 'Cardano',
              accountId: account2Id,
              addresses: [cardanoAccount0Addr],
            }),
            actions.sync.addSyncOperation({
              accountId: account2Id,
              operation: {
                operationId: `${account2Id}-${tipHash2}-transaction-polling`,
                status: 'Pending',
                description: 'sync.operation.transaction-polling',
                startedAt: expect.any(Number) as unknown as Timestamp,
              },
            }),
            actions.sync.completeSyncOperation({
              accountId: account2Id,
              operationId: op2Id,
            }),
          ]);
        },
      };
    });
  });

  it('forwards thorough=false to discoverAddresses for a standard ADDRESS_DISCOVERY operation', () => {
    testSideEffect(addressDiscoverySync, ({ cold, hot, flush }) => {
      const accountId = threeAccountCardanoWalletAccounts[0].accountId;
      const operationId = `${accountId}-tip-hash-address-discovery`;
      const operation: SyncOperation = {
        operationId,
        status: 'Pending',
        description: 'sync.operation.address-discovery',
        startedAt: Timestamp(Date.now()),
      };
      const addSyncOperation$ = hot('a', {
        a: actions.sync.addSyncOperation({ accountId, operation }),
      });
      const accounts$ = hot<AnyAccount[]>('a', {
        a: [threeAccountCardanoWalletAccounts[0]],
      });
      const discoverAddresses = vi
        .fn()
        .mockImplementation(() => cold('-a|', { a: Ok(cardanoAccount0Addr) }));

      return {
        actionObservables: {
          sync: { addSyncOperation$: addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
        },
        dependencies: {
          cardanoProvider: {
            discoverAddresses,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(discoverAddresses).toHaveBeenCalledTimes(1);
          expect(discoverAddresses).toHaveBeenCalledWith(
            expect.objectContaining({ thorough: false }),
            expect.anything(),
          );
        },
      };
    });
  });

  it('forwards thorough=true to discoverAddresses and chains transaction-polling on the same round for an ADDRESS_DISCOVERY_THOROUGH operation', () => {
    testSideEffect(addressDiscoverySync, ({ cold, hot, flush }) => {
      const accountId = threeAccountCardanoWalletAccounts[0].accountId;
      const tipHash = 'tip-hash';
      const operationId = `${accountId}-${tipHash}-address-discovery-thorough`;
      const operation: SyncOperation = {
        operationId,
        status: 'Pending',
        description: 'sync.operation.address-discovery',
        startedAt: Timestamp(Date.now()),
      };
      const addSyncOperation$ = hot('a', {
        a: actions.sync.addSyncOperation({ accountId, operation }),
      });
      const accounts$ = hot<AnyAccount[]>('a', {
        a: [threeAccountCardanoWalletAccounts[0]],
      });
      const discoverAddresses = vi
        .fn()
        .mockImplementation(() => cold('-a|', { a: Ok(cardanoAccount0Addr) }));

      return {
        actionObservables: {
          sync: { addSyncOperation$: addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
        },
        dependencies: {
          cardanoProvider: {
            discoverAddresses,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          const emissions: CardanoSyncAction[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          // Provider was called with the thorough flag set.
          expect(discoverAddresses).toHaveBeenCalledTimes(1);
          expect(discoverAddresses).toHaveBeenCalledWith(
            expect.objectContaining({ thorough: true }),
            expect.anything(),
          );

          // The chained transaction-polling op reuses the thorough op's tip
          // hash — proves chainAccountStateOperations parses the tip correctly
          // for the thorough variant (suffix length differs from standard).
          expect(emissions).toEqual([
            actions.sync.updateSyncOperation({
              accountId,
              operationId,
              update: {
                status: 'InProgress',
                type: 'Indeterminate',
              },
            }),
            actions.addresses.upsertAddresses({
              blockchainName: 'Cardano',
              accountId,
              addresses: [cardanoAccount0Addr],
            }),
            actions.sync.addSyncOperation({
              accountId,
              operation: {
                operationId: `${accountId}-${tipHash}-transaction-polling`,
                status: 'Pending',
                description: 'sync.operation.transaction-polling',
                startedAt: expect.any(Number) as unknown as Timestamp,
              },
            }),
            actions.sync.completeSyncOperation({
              accountId,
              operationId,
            }),
          ]);
        },
      };
    });
  });

  describe('custody accounts', () => {
    const custodyAccountId = cardanoCustodyAccount.accountId;
    const operationId = `${custodyAccountId}-tip-hash-address-discovery`;
    const operation: SyncOperation = {
      operationId,
      status: 'Pending',
      description: 'sync.operation.address-discovery',
      startedAt: Timestamp(Date.now()),
    };

    const custodyDiscovery = (hot: RunHelpers['hot'], account: AnyAccount) => {
      const discoverAddresses = vi.fn();
      const logger = { ...dummyLogger, error: vi.fn() };
      return {
        discoverAddresses,
        logger,
        setup: {
          actionObservables: {
            sync: {
              addSyncOperation$: hot('a', {
                a: actions.sync.addSyncOperation({
                  accountId: custodyAccountId,
                  operation,
                }),
              }),
            },
          },
          stateObservables: {
            wallets: {
              selectActiveNetworkAccounts$: hot<AnyAccount[]>('a', {
                a: [account],
              }),
            },
          },
          dependencies: {
            cardanoProvider: {
              discoverAddresses,
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
            logger,
          },
        },
      };
    };

    const discoveredActions = (accountId: AccountId) => ({
      a: actions.sync.updateSyncOperation({
        accountId,
        operationId,
        update: { status: 'InProgress', type: 'Indeterminate' },
      }),
      b: actions.addresses.upsertAddresses({
        blockchainName: 'Cardano',
        accountId,
        addresses: [
          {
            address: CardanoPaymentAddress(custodyAddress),
            name: '0/0',
            data: {
              accountIndex: 0,
              index: 0,
              networkId: Cardano.NetworkId.Testnet,
              networkMagic: Cardano.NetworkMagics.Preprod,
              rewardAccount: CardanoRewardAccount(custodyRewardAccount),
              type: AddressType.External,
              stakeKeyDerivationPath: undefined,
            },
          },
        ],
      }),
      c: actions.sync.addSyncOperation({
        accountId,
        operation: {
          operationId: `${accountId}-tip-hash-transaction-polling`,
          status: 'Pending',
          description: 'sync.operation.transaction-polling',
          startedAt: expect.any(Number) as unknown as Timestamp,
        },
      }),
      d: actions.sync.completeSyncOperation({ accountId, operationId }),
    });

    it('emits the one custody address entry, with the network magic and the script reward account, and chains polling', () => {
      testSideEffect(
        addressDiscoverySync,
        ({ hot, expectObservable, flush }) => {
          const { discoverAddresses, setup } = custodyDiscovery(
            hot,
            cardanoCustodyAccount,
          );
          return {
            ...setup,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe(
                '(abcd)',
                discoveredActions(custodyAccountId),
              );
              flush();
              expect(discoverAddresses).not.toHaveBeenCalled();
            },
          };
        },
      );
    });

    it('discovers an observer account, which has no device binding, the same way', () => {
      testSideEffect(addressDiscoverySync, ({ hot, expectObservable }) => {
        const { setup } = custodyDiscovery(hot, observerCustodyAccount);
        return {
          ...setup,
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe(
              '(abcd)',
              discoveredActions(custodyAccountId),
            );
          },
        };
      });
    });

    it('fails the sync without storing an address when the stored address is not the one the identity derives', () => {
      testSideEffect(
        addressDiscoverySync,
        ({ hot, expectObservable, flush }) => {
          const tampered: AnyAccount = {
            ...cardanoCustodyAccount,
            blockchainSpecific: {
              ...cardanoCustodyAccount.blockchainSpecific,
              address: foreignPaymentAddress,
            },
          };
          const { logger, setup } = custodyDiscovery(hot, tampered);
          return {
            ...setup,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.sync.failSyncOperation({
                  accountId: custodyAccountId,
                  operationId,
                  error:
                    'sync.error.address-discovery-failed' as TranslationKey,
                }),
              });
              flush();
              expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('identity-mismatch'),
                {
                  code: 'identity-mismatch',
                  field: 'address',
                  stored: foreignPaymentAddress,
                  derived: custodyAddress,
                },
              );
            },
          };
        },
      );
    });
  });

  it('should handle MultiSig accounts with script address', () => {
    testSideEffect(addressDiscoverySync, ({ hot, expectObservable }) => {
      const multiSigAccountId = AccountId('multisig-account-1');
      const tipHash = 'tip-hash';
      const operationId = `${multiSigAccountId}-${tipHash}-address-discovery`;
      const operation: SyncOperation = {
        operationId,
        status: 'Pending',
        description: 'sync.operation.address-discovery',
        startedAt: Timestamp(Date.now()),
      };

      const mockScriptAddress: GroupedAddress = {
        accountIndex: 0,
        address: Cardano.PaymentAddress(
          'addr_test1qrml5hwl9s7ydm2djyup95ud6s74skkl4zzf8zk657s8thgm78sn3uhch64ujc7ffnpga68dfdqhg3sp7tk6759jrm7spy03k9',
        ),
        index: 0,
        networkId:
          threeAccountCardanoWalletAccounts[0].blockchainSpecific.chainId
            .networkId,
        rewardAccount: Cardano.RewardAccount(
          'stake_test1uqwyd92lw8zf5mycwyzpgh26rq253ql4rjzxcy4x5qku6cq729ece',
        ),
        type: AddressType.External,
      };

      // Mock getScriptAddress to return our test address
      vi.spyOn(getScriptAddressModule, 'getScriptAddress').mockReturnValue(
        mockScriptAddress,
      );

      const addSyncOperation$ = hot('a', {
        a: actions.sync.addSyncOperation({
          accountId: multiSigAccountId,
          operation,
        }),
      });

      const multiSigAccount: MultiSigWalletAccount = {
        blockchainName: 'Cardano',
        networkType: 'testnet',
        blockchainNetworkId: BlockchainNetworkId('cardano-1'),
        accountType: 'MultiSig',
        blockchainSpecific: {
          chainId:
            threeAccountCardanoWalletAccounts[0].blockchainSpecific.chainId,
          paymentKeyPath: { index: 0, role: 0 },
          stakingKeyPath: { index: 0, role: 2 },
          paymentScript: { kind: 0, scripts: [] },
          stakingScript: { kind: 0, scripts: [] },
        },
        walletId: WalletId('multisig-wallet-1'),
        accountId: multiSigAccountId,
        metadata: { name: 'MultiSig Account' },
        ownSigners: [],
      };

      const accounts$ = hot<AnyAccount[]>('a', {
        a: [multiSigAccount],
      });

      return {
        actionObservables: {
          sync: { addSyncOperation$: addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
        },
        dependencies: {
          cardanoProvider:
            {} as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(abcd)', {
            a: actions.sync.updateSyncOperation({
              accountId: multiSigAccountId,
              operationId,
              update: {
                status: 'InProgress',
                type: 'Indeterminate',
              },
            }),
            b: actions.addresses.upsertAddresses({
              blockchainName: 'Cardano',
              accountId: multiSigAccountId,
              addresses: [
                toContractAddress(
                  mockScriptAddress,
                  threeAccountCardanoWalletAccounts[0].blockchainSpecific
                    .chainId.networkMagic,
                ),
              ],
            }),
            c: actions.sync.addSyncOperation({
              accountId: multiSigAccountId,
              operation: {
                operationId: `${multiSigAccountId}-${tipHash}-transaction-polling`,
                status: 'Pending',
                description: 'sync.operation.transaction-polling',
                startedAt: expect.any(Number) as unknown as Timestamp,
              },
            }),
            d: actions.sync.completeSyncOperation({
              accountId: multiSigAccountId,
              operationId,
            }),
          });
        },
      };
    });
  });

  it.each([
    Cardano.ChainIds.Mainnet,
    Cardano.ChainIds.Preprod,
    Cardano.ChainIds.Preview,
  ])(
    'discovers a multisig address with network and reward metadata on $networkMagic',
    chainId => {
      vi.restoreAllMocks();
      const account = {
        ...scriptAccount,
        blockchainSpecific: { ...scriptAccount.blockchainSpecific, chainId },
      };
      const operationId = `${account.accountId}-tip-address-discovery-thorough`;
      testSideEffect(addressDiscoverySync, ({ hot, flush }) => {
        const emitted: CardanoSyncAction[] = [];
        return {
          actionObservables: {
            sync: {
              addSyncOperation$: hot('-a', {
                a: actions.sync.addSyncOperation({
                  accountId: account.accountId,
                  operation: {
                    operationId,
                    status: 'Pending',
                    description: 'sync.operation.address-discovery',
                    startedAt: Timestamp(0),
                  },
                }),
              }),
            },
          },
          stateObservables: {
            wallets: {
              selectActiveNetworkAccounts$: of([account]),
            },
          },
          dependencies: {
            actions,
            logger: dummyLogger,
            cardanoProvider: {
              discoverAddresses: vi.fn(),
              getAccountUtxos: vi.fn(),
              getUtxosAtAddress: vi.fn(),
              getTip: vi.fn(),
              getTokens: vi.fn(),
              getTokenMetadata: vi.fn(),
              getAddressTransactionHistory: vi.fn(),
              getAccountRewards: vi.fn(),
              getAccountDelegations: vi.fn(),
              getAccountRegistrations: vi.fn(),
              getAccountWithdrawals: vi.fn(),
              getRewardAccountInfo: vi.fn(),
              getTransactionDetails: vi.fn(),
              getProtocolParameters: vi.fn(),
              getEraSummaries: vi.fn(),
              resolveInput: vi.fn(),
              submitTx: vi.fn(),
              evaluateTx: vi.fn(),
              getDReps: vi.fn(),
            },
          },
          assertion: source => {
            source.subscribe(action => emitted.push(action));
            flush();
            const upsert = emitted.find(
              actions.addresses.upsertAddresses.match,
            )!;
            const address = upsert.payload.addresses[0];
            expect(
              Cardano.Address.fromBech32(address.address).getNetworkId(),
            ).toBe(chainId.networkId);
            expect(address.data).toMatchObject({
              networkId: chainId.networkId,
              networkMagic: chainId.networkMagic,
            });
            const data = address.data as CardanoAddressData;
            expect(data.rewardAccount).toEqual(expect.any(String));
            expect(
              Cardano.Address.fromBech32(data.rewardAccount)
                .asReward()!
                .getPaymentCredential().type,
            ).toBe(Cardano.CredentialType.ScriptHash);
            expect(emitted.at(-1)).toEqual(
              actions.sync.completeSyncOperation({
                accountId: account.accountId,
                operationId,
              }),
            );
          },
        };
      });
    },
  );
});
