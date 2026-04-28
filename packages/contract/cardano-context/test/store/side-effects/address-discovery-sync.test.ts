import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { addressesActions } from '@lace-contract/addresses';
import { BlockchainNetworkId } from '@lace-contract/network';
import { syncActions } from '@lace-contract/sync';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { Timestamp } from '@lace-sdk/util';
import { Err, Ok } from '@lace-sdk/util';
import { describe, expect, it, vi } from 'vitest';

import { CardanoPaymentAddress } from '../../../src';
import { cardanoContextActions } from '../../../src/store';
import * as getScriptAddressModule from '../../../src/store/get-script-address';
import { addressDiscoverySync } from '../../../src/store/side-effects/address-discovery-sync';
import {
  cardanoAccount0Addr,
  threeAccountCardanoWalletAccounts,
} from '../../mocks';

import type { Action } from '../../../src/contract';
import type {
  CardanoProviderDependencies,
  DiscoverAddressesProps,
} from '../../../src/types';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { SyncOperation } from '@lace-contract/sync';
import type {
  AnyAccount,
  MultiSigWalletAccount,
} from '@lace-contract/wallet-repo';

const actions = {
  ...syncActions,
  ...addressesActions,
  ...cardanoContextActions,
};

describe('addressDiscoverySync', () => {
  it('marks operation as InProgress on start, upserts addresses and completes on success', () => {
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
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a-(bc)', {
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
            c: actions.sync.completeSyncOperation({
              accountId,
              operationId,
            }),
          });
        },
      };
    });
  });

  it('should succeed when address discovery succeeds immediately', () => {
    // Note: Full retry behavior (exponential backoff timing) is tested in integration tests
    // This test verifies the happy path with retryBackoff operator applied
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
        },
        assertion: sideEffect$ => {
          // Same behavior as success test - transparent retry doesn't change happy path
          expectObservable(sideEffect$).toBe('a-(bc)', {
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
            c: actions.sync.completeSyncOperation({
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
        },
        assertion: sideEffect$ => {
          // Collect emissions to verify failure occurs after retries
          const emissions: Action[] = [];
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
        },
        assertion: sideEffect$ => {
          // Should emit nothing because operation ID doesn't end with -address-discovery
          expectObservable(sideEffect$).toBe('-');
        },
      };
    });
  });

  it('should process multiple operations concurrently without cancelling (mergeMap behavior)', () => {
    testSideEffect(addressDiscoverySync, ({ cold, hot, expectObservable }) => {
      const account1Id = threeAccountCardanoWalletAccounts[0].accountId;
      const account2Id = threeAccountCardanoWalletAccounts[1].accountId;
      const op1Id = `${account1Id}-tip-hash-1-address-discovery`;
      const op2Id = `${account2Id}-tip-hash-2-address-discovery`;

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
          // Second call (op2): takes 6 frames to complete at frame 7
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
        },
        assertion: sideEffect$ => {
          // With mergeMap, both operations should complete concurrently
          // Note: Parentheses in marbles consume frames: (cd) spans frames 3-6, (ef) starts at frame 7
          expectObservable(sideEffect$).toBe('ab--(cd)(ef)', {
            // Frame 0: op1 update (action emitted), subscribe to accounts$ (cold), accounts$ emits immediately
            a: actions.sync.updateSyncOperation({
              accountId: account1Id,
              operationId: op1Id,
              update: { status: 'InProgress', type: 'Indeterminate' },
            }),
            // Frame 1: op2 update (action emitted), subscribe to accounts$ (cold), accounts$ emits immediately
            b: actions.sync.updateSyncOperation({
              accountId: account2Id,
              operationId: op2Id,
              update: { status: 'InProgress', type: 'Indeterminate' },
            }),
            // Frame 3: op1 complete (discovery started at frame 0, takes 3 frames)
            c: actions.addresses.upsertAddresses({
              blockchainName: 'Cardano',
              accountId: account1Id,
              addresses: [cardanoAccount0Addr],
            }),
            d: actions.sync.completeSyncOperation({
              accountId: account1Id,
              operationId: op1Id,
            }),
            // Frame 7: op2 complete (discovery started at frame 1, takes 6 frames)
            e: actions.addresses.upsertAddresses({
              blockchainName: 'Cardano',
              accountId: account2Id,
              addresses: [cardanoAccount0Addr],
            }),
            f: actions.sync.completeSyncOperation({
              accountId: account2Id,
              operationId: op2Id,
            }),
          });
        },
      };
    });
  });

  it('should handle MultiSig accounts with script address', () => {
    testSideEffect(addressDiscoverySync, ({ hot, expectObservable }) => {
      const multiSigAccountId = AccountId('multisig-account-1');
      const operationId = `${multiSigAccountId}-tip-hash-address-discovery`;
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
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(abc)', {
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
                {
                  ...mockScriptAddress,
                  address: CardanoPaymentAddress(mockScriptAddress.address),
                },
              ],
            }),
            c: actions.sync.completeSyncOperation({
              accountId: multiSigAccountId,
              operationId,
            }),
          });
        },
      };
    });
  });
});
