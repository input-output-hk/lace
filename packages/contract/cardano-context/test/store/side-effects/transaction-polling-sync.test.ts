import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { addressesActions } from '@lace-contract/addresses';
import { syncActions } from '@lace-contract/sync';
import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { Err, Ok, Timestamp } from '@lace-sdk/util';
import { defer, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CardanoPaymentAddress } from '../../../src';
import { cardanoContextActions } from '../../../src/store';
import { transactionPollingSync } from '../../../src/store/side-effects/transaction-polling-sync';
import {
  cardanoAccount0Addr,
  threeAccountCardanoWalletAccounts,
} from '../../mocks';

import type { CardanoContextAction } from '../../../src/contract';
import type {
  CardanoAddressTransactionHistoryMap,
  CardanoProviderDependencies,
  CardanoTransactionHistoryItem,
} from '../../../src/types';
import type { AnyAddress } from '@lace-contract/addresses';
import type { SyncOperation } from '@lace-contract/sync';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const actions = {
  ...syncActions,
  ...addressesActions,
  ...cardanoContextActions,
};

const account = threeAccountCardanoWalletAccounts[0];
const accountId = account.accountId;
const operationId = `${accountId}-tip-hash-transaction-polling`;

const address1: AnyAddress = { ...cardanoAccount0Addr, accountId };
const address1Payment = CardanoPaymentAddress(address1.address);

const tx1: CardanoTransactionHistoryItem = {
  hash: Cardano.TransactionId(
    '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
  ),
  blockTime: Cardano.Slot(100),
  txIndex: 0,
} as unknown as CardanoTransactionHistoryItem;

const nonRetriableError = new ProviderError(ProviderFailure.BadRequest);
const retriableError = new ProviderError(ProviderFailure.Unhealthy);

const pendingOperation: SyncOperation = {
  operationId,
  status: 'Pending',
  description: 'sync.operation.transaction-polling',
  startedAt: Timestamp(Date.now()),
};

describe('transactionPollingSync', () => {
  it('marks operation InProgress, fetches newer transactions, sets them, and completes', () => {
    testSideEffect(transactionPollingSync, ({ cold, hot, flush }) => {
      // Delay source by 1 frame so withLatestFrom sees secondaries first
      const addSyncOperation$ = hot('-a', {
        a: actions.sync.addSyncOperation({
          accountId,
          operation: pendingOperation,
        }),
      });
      const accounts$ = hot<AnyAccount[]>('a', { a: [account] });
      const addresses$ = hot<AnyAddress[]>('a', { a: [address1] });
      const transactionHistory$ = hot<
        Record<string, CardanoAddressTransactionHistoryMap>
      >('a', { a: {} });
      const getAddressTransactionHistory = vi
        .fn()
        .mockImplementation(() => cold('-a|', { a: Ok([tx1]) }));

      return {
        actionObservables: {
          sync: { addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          cardanoContext: {
            selectAccountTransactionHistory$: transactionHistory$,
          },
        },
        dependencies: {
          cardanoProvider: {
            getAddressTransactionHistory,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: CardanoContextAction[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(emissions).toEqual([
            actions.sync.updateSyncOperation({
              accountId,
              operationId,
              update: { status: 'InProgress', type: 'Indeterminate' },
            }),
            actions.cardanoContext.setAccountTransactionHistory({
              accountId,
              addressHistories: [
                {
                  address: address1Payment,
                  transactionHistory: [tx1],
                  hasLoadedOldestEntry: true,
                },
              ],
            }),
            actions.sync.completeSyncOperation({ accountId, operationId }),
          ]);
        },
      };
    });
  });

  it('completes immediately (no InProgress) when the account has no addresses', () => {
    testSideEffect(transactionPollingSync, ({ hot, flush }) => {
      const addSyncOperation$ = hot('-a', {
        a: actions.sync.addSyncOperation({
          accountId,
          operation: pendingOperation,
        }),
      });
      const accounts$ = hot<AnyAccount[]>('a', { a: [account] });
      const addresses$ = hot<AnyAddress[]>('a', { a: [] });
      const transactionHistory$ = hot<
        Record<string, CardanoAddressTransactionHistoryMap>
      >('a', { a: {} });
      const getAddressTransactionHistory = vi.fn();

      return {
        actionObservables: {
          sync: { addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          cardanoContext: {
            selectAccountTransactionHistory$: transactionHistory$,
          },
        },
        dependencies: {
          cardanoProvider: {
            getAddressTransactionHistory,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: CardanoContextAction[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(emissions).toEqual([
            actions.sync.completeSyncOperation({ accountId, operationId }),
          ]);
          expect(getAddressTransactionHistory).not.toHaveBeenCalled();
        },
      };
    });
  });

  it('fails operation when provider errors with non-retriable error', () => {
    testSideEffect(transactionPollingSync, ({ hot, flush }) => {
      const addSyncOperation$ = hot('-a', {
        a: actions.sync.addSyncOperation({
          accountId,
          operation: pendingOperation,
        }),
      });
      const accounts$ = hot<AnyAccount[]>('a', { a: [account] });
      const addresses$ = hot<AnyAddress[]>('a', { a: [address1] });
      const transactionHistory$ = hot<
        Record<string, CardanoAddressTransactionHistoryMap>
      >('a', { a: {} });
      const getAddressTransactionHistory = vi
        .fn()
        .mockReturnValue(of(Err(nonRetriableError)));

      return {
        actionObservables: {
          sync: { addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          cardanoContext: {
            selectAccountTransactionHistory$: transactionHistory$,
          },
        },
        dependencies: {
          cardanoProvider: {
            getAddressTransactionHistory,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: CardanoContextAction[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(emissions).toEqual([
            actions.sync.updateSyncOperation({
              accountId,
              operationId,
              update: { status: 'InProgress', type: 'Indeterminate' },
            }),
            actions.sync.failSyncOperation({
              accountId,
              operationId,
              error: 'sync.error.transaction-polling-failed',
            }),
          ]);
        },
      };
    });
  });

  it('retries retriable errors with exponential backoff before failing', () => {
    testSideEffect(transactionPollingSync, ({ cold, hot, flush }) => {
      const addSyncOperation$ = hot('-a', {
        a: actions.sync.addSyncOperation({
          accountId,
          operation: pendingOperation,
        }),
      });
      const accounts$ = hot<AnyAccount[]>('a', { a: [account] });
      const addresses$ = hot<AnyAddress[]>('a', { a: [address1] });
      const transactionHistory$ = hot<
        Record<string, CardanoAddressTransactionHistoryMap>
      >('a', { a: {} });
      let subscriptions = 0;
      const getAddressTransactionHistory = vi.fn().mockImplementation(() =>
        defer(() => {
          subscriptions += 1;
          return cold('-#', {}, retriableError);
        }),
      );

      return {
        actionObservables: {
          sync: { addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          cardanoContext: {
            selectAccountTransactionHistory$: transactionHistory$,
          },
        },
        dependencies: {
          cardanoProvider: {
            getAddressTransactionHistory,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: CardanoContextAction[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(emissions.length).toBe(2);
          expect(emissions[0]).toEqual(
            actions.sync.updateSyncOperation({
              accountId,
              operationId,
              update: { status: 'InProgress', type: 'Indeterminate' },
            }),
          );
          expect(emissions[1]).toEqual(
            actions.sync.failSyncOperation({
              accountId,
              operationId,
              error: 'sync.error.transaction-polling-failed',
            }),
          );
          // 1 initial attempt + 3 retries
          expect(subscriptions).toBe(4);
        },
      };
    });
  });

  it('recovers without failing when a retry succeeds', () => {
    testSideEffect(transactionPollingSync, ({ cold, hot, flush }) => {
      const addSyncOperation$ = hot('-a', {
        a: actions.sync.addSyncOperation({
          accountId,
          operation: pendingOperation,
        }),
      });
      const accounts$ = hot<AnyAccount[]>('a', { a: [account] });
      const addresses$ = hot<AnyAddress[]>('a', { a: [address1] });
      const transactionHistory$ = hot<
        Record<string, CardanoAddressTransactionHistoryMap>
      >('a', { a: {} });
      let subscriptions = 0;
      const getAddressTransactionHistory = vi.fn().mockImplementation(() =>
        defer(() => {
          subscriptions += 1;
          if (subscriptions === 1) return cold('-#', {}, retriableError);
          return cold('a|', { a: Ok([tx1]) });
        }),
      );

      return {
        actionObservables: {
          sync: { addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          cardanoContext: {
            selectAccountTransactionHistory$: transactionHistory$,
          },
        },
        dependencies: {
          cardanoProvider: {
            getAddressTransactionHistory,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: CardanoContextAction[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(emissions.length).toBe(3);
          expect(emissions[0]).toEqual(
            actions.sync.updateSyncOperation({
              accountId,
              operationId,
              update: { status: 'InProgress', type: 'Indeterminate' },
            }),
          );
          expect(emissions[1]).toEqual(
            actions.cardanoContext.setAccountTransactionHistory({
              accountId,
              addressHistories: [
                {
                  address: address1Payment,
                  transactionHistory: [tx1],
                  hasLoadedOldestEntry: true,
                },
              ],
            }),
          );
          expect(emissions[2]).toEqual(
            actions.sync.completeSyncOperation({ accountId, operationId }),
          );
          expect(subscriptions).toBe(2);
        },
      };
    });
  });

  it('skips operations that are not pending', () => {
    testSideEffect(transactionPollingSync, ({ hot, expectObservable }) => {
      const addSyncOperation$ = hot('a', {
        a: actions.sync.addSyncOperation({
          accountId,
          operation: {
            ...pendingOperation,
            status: 'InProgress',
            type: 'Indeterminate',
          },
        }),
      });
      const accounts$ = hot<AnyAccount[]>('a', { a: [account] });
      const addresses$ = hot<AnyAddress[]>('a', { a: [address1] });
      const transactionHistory$ = hot<
        Record<string, CardanoAddressTransactionHistoryMap>
      >('a', { a: {} });
      return {
        actionObservables: {
          sync: { addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          cardanoContext: {
            selectAccountTransactionHistory$: transactionHistory$,
          },
        },
        dependencies: {
          cardanoProvider:
            {} as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
        },
      };
    });
  });

  it('skips operations that are not transaction-polling', () => {
    testSideEffect(transactionPollingSync, ({ hot, expectObservable }) => {
      const addSyncOperation$ = hot('a', {
        a: actions.sync.addSyncOperation({
          accountId,
          operation: {
            operationId: `${accountId}-tip-hash-address-discovery`,
            status: 'Pending',
            description: 'sync.operation.address-discovery',
            startedAt: Timestamp(Date.now()),
          },
        }),
      });
      const accounts$ = hot<AnyAccount[]>('a', { a: [account] });
      const addresses$ = hot<AnyAddress[]>('a', { a: [address1] });
      const transactionHistory$ = hot<
        Record<string, CardanoAddressTransactionHistoryMap>
      >('a', { a: {} });
      return {
        actionObservables: {
          sync: { addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          cardanoContext: {
            selectAccountTransactionHistory$: transactionHistory$,
          },
        },
        dependencies: {
          cardanoProvider:
            {} as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
        },
      };
    });
  });

  it('skips when account is not in active network accounts', () => {
    testSideEffect(transactionPollingSync, ({ hot, expectObservable }) => {
      const addSyncOperation$ = hot('a', {
        a: actions.sync.addSyncOperation({
          accountId: AccountId('missing-account'),
          operation: {
            ...pendingOperation,
            operationId: `missing-account-tip-hash-transaction-polling`,
          },
        }),
      });
      const accounts$ = hot<AnyAccount[]>('a', { a: [account] });
      const addresses$ = hot<AnyAddress[]>('a', { a: [] });
      const transactionHistory$ = hot<
        Record<string, CardanoAddressTransactionHistoryMap>
      >('a', { a: {} });
      return {
        actionObservables: {
          sync: { addSyncOperation$ },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          cardanoContext: {
            selectAccountTransactionHistory$: transactionHistory$,
          },
        },
        dependencies: {
          cardanoProvider:
            {} as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
        },
      };
    });
  });
});
