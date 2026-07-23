import { Cardano } from '@cardano-sdk/core';
import { syncActions } from '@lace-contract/sync';
import { Timestamp } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { combineLatest, filter, map } from 'rxjs';
import { describe, it } from 'vitest';

import {
  createCoordinateCardanoSync,
  type CardanoSyncEngineConfig,
  type CardanoSyncRoundContext,
} from '../../../src/store/side-effects/coordinate-sync';
import { cardanoContextActions } from '../../../src/store/slice';
import { isCardanoAccount } from '../../../src/util';
import {
  previewAccountCardanoWalletAccounts,
  threeAccountCardanoWalletAccounts,
} from '../../mocks';

import type { CardanoWalletAccount } from '../../../src/util';
import type { SyncOperation, SyncOperationId } from '@lace-contract/sync';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const actions = {
  ...syncActions,
  ...cardanoContextActions,
};

// Synthetic config: proves the engine is generic over any round-model config,
// not coupled to the monolith's trigger/operation derivation.
//
// - trigger$ derives the round context from the accounts + chainId state
//   observables (whatever the engine is handed), so the test drives everything
//   through marbles. The engine never knows how the context was produced.
// - buildRoundOperations returns a single fixed operation per account, keyed
//   by accountId, so assertions are deterministic.

// Fixed timestamp so the operation built by the config and the one built for
// the assertion are byte-for-byte equal (no Date.now() skew across calls).
const SYNTHETIC_STARTED_AT = Timestamp(0);

const syntheticOperation = (account: CardanoWalletAccount): SyncOperation => ({
  operationId: `${account.accountId}-synthetic-op`,
  status: 'Pending',
  description: 'sync.operation.address-discovery',
  startedAt: SYNTHETIC_STARTED_AT,
});

const syntheticConfig: CardanoSyncEngineConfig<CardanoSyncRoundContext> = {
  trigger$: (
    _actionObservables,
    {
      wallets: { selectActiveNetworkAccounts$ },
      cardanoContext: { selectChainId$ },
    },
  ) =>
    combineLatest([
      selectActiveNetworkAccounts$,
      selectChainId$.pipe(filter(Boolean)),
    ]).pipe(
      map(([accounts, chainId]) => ({
        accounts: accounts.filter(isCardanoAccount),
        chainId,
      })),
    ),
  buildRoundOperations: account => [syntheticOperation(account)],
};

describe('createCoordinateCardanoSync (engine)', () => {
  it('dispatches operations only for accounts on the active chain', () => {
    testSideEffect(
      createCoordinateCardanoSync(syntheticConfig),
      ({ hot, expectObservable }) => {
        const account0 = threeAccountCardanoWalletAccounts[0]; // Preprod
        const account1 = threeAccountCardanoWalletAccounts[1]; // Preprod

        const accounts$ = hot<AnyAccount[]>('a', {
          a: [
            account0,
            previewAccountCardanoWalletAccounts[0], // Preview (inactive)
            account1,
          ],
        });
        const chainId$ = hot<Cardano.ChainId>('a', {
          a: Cardano.ChainIds.Preprod,
        });
        const selectIsSyncOperationPending$ = hot('a', {
          a: (_opId: SyncOperationId) => false, // Operations complete immediately
        });

        return {
          actionObservables: {},
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            cardanoContext: { selectChainId$: chainId$ },
            sync: { selectIsSyncOperationPending$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            // Only Preprod accounts (account0, account1); Preview filtered out
            expectObservable(sideEffect$).toBe('(ac)', {
              a: actions.sync.addSyncOperation({
                accountId: account0.accountId,
                operation: syntheticOperation(account0),
              }),
              c: actions.sync.addSyncOperation({
                accountId: account1.accountId,
                operation: syntheticOperation(account1),
              }),
            });
          },
        };
      },
    );
  });

  it('drops a second trigger while a round is in progress (exhaustMap)', () => {
    testSideEffect(
      createCoordinateCardanoSync(syntheticConfig),
      ({ hot, expectObservable }) => {
        const account0 = threeAccountCardanoWalletAccounts[0];

        // Two distinct account sets at consecutive frames -> two triggers.
        const accounts$ = hot<AnyAccount[]>('ab', {
          a: [account0],
          b: [threeAccountCardanoWalletAccounts[1]],
        });
        const chainId$ = hot<Cardano.ChainId>('a', {
          a: Cardano.ChainIds.Preprod,
        });
        // Operations stay pending (never complete) so the round lock is held
        // and the second trigger is dropped by exhaustMap.
        const selectIsSyncOperationPending$ = hot('a', {
          a: (_opId: SyncOperationId) => true,
        });

        return {
          actionObservables: {},
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            cardanoContext: { selectChainId$: chainId$ },
            sync: { selectIsSyncOperationPending$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            // Only the first round's operation is dispatched.
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.addSyncOperation({
                accountId: account0.accountId,
                operation: syntheticOperation(account0),
              }),
            });
          },
        };
      },
    );
  });

  it('releases the round when operations transition pending -> non-pending', () => {
    testSideEffect(
      createCoordinateCardanoSync(syntheticConfig),
      ({ hot, expectObservable }) => {
        const account0 = threeAccountCardanoWalletAccounts[0];
        const account1 = threeAccountCardanoWalletAccounts[1];

        // Second trigger arrives at frame 3, well after round 1 releases at
        // frame 2, so it unambiguously proceeds (not dropped by exhaustMap).
        const accounts$ = hot<AnyAccount[]>('a--b', {
          a: [account0],
          b: [account1],
        });
        const chainId$ = hot<Cardano.ChainId>('a', {
          a: Cardano.ChainIds.Preprod,
        });
        // Round 1 sees pending at frames 0-1 (started), then non-pending from
        // frame 2 (released), letting round 2 proceed when it triggers.
        const selectIsSyncOperationPending$ = hot('aabbb', {
          a: (_opId: SyncOperationId): boolean => true,
          b: (_opId: SyncOperationId): boolean => false,
        });

        return {
          actionObservables: {},
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            cardanoContext: { selectChainId$: chainId$ },
            sync: { selectIsSyncOperationPending$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            // Round 1 dispatches at frame 0 (releases at frame 2); round 2
            // then dispatches account1's operation at frame 3.
            expectObservable(sideEffect$).toBe('a--b', {
              a: actions.sync.addSyncOperation({
                accountId: account0.accountId,
                operation: syntheticOperation(account0),
              }),
              b: actions.sync.addSyncOperation({
                accountId: account1.accountId,
                operation: syntheticOperation(account1),
              }),
            });
          },
        };
      },
    );
  });

  it('emits nothing when buildRoundOperations yields no operations', () => {
    testSideEffect(
      createCoordinateCardanoSync({
        trigger$: syntheticConfig.trigger$,
        // No operations for any account
        buildRoundOperations: () => [],
      }),
      ({ hot, expectObservable }) => {
        const accounts$ = hot<AnyAccount[]>('a', {
          a: [threeAccountCardanoWalletAccounts[0]],
        });
        const chainId$ = hot<Cardano.ChainId>('a', {
          a: Cardano.ChainIds.Preprod,
        });
        const selectIsSyncOperationPending$ = hot('a', {
          a: (_opId: SyncOperationId) => false,
        });

        return {
          actionObservables: {},
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            cardanoContext: { selectChainId$: chainId$ },
            sync: { selectIsSyncOperationPending$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        };
      },
    );
  });

  it('emits nothing when no accounts are on the active chain', () => {
    testSideEffect(
      createCoordinateCardanoSync(syntheticConfig),
      ({ hot, expectObservable }) => {
        // Only a Preview account, but active chain is Preprod
        const accounts$ = hot<AnyAccount[]>('a', {
          a: [previewAccountCardanoWalletAccounts[0]],
        });
        const chainId$ = hot<Cardano.ChainId>('a', {
          a: Cardano.ChainIds.Preprod,
        });
        const selectIsSyncOperationPending$ = hot('a', {
          a: (_opId: SyncOperationId) => false,
        });

        return {
          actionObservables: {},
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            cardanoContext: { selectChainId$: chainId$ },
            sync: { selectIsSyncOperationPending$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        };
      },
    );
  });

  it('releases the round via the 60s timeout race when operations never settle', () => {
    testSideEffect(
      createCoordinateCardanoSync(syntheticConfig),
      ({ hot, expectObservable }) => {
        const account0 = threeAccountCardanoWalletAccounts[0];
        const account1 = threeAccountCardanoWalletAccounts[1];

        // First trigger at frame 0; a second trigger arrives AFTER the 60s
        // timeout has fired, so it only proceeds because the timeout released
        // the round lock (operations stay pending the entire time).
        const accounts$ = hot<AnyAccount[]>('a 60001ms b', {
          a: [account0],
          b: [account1],
        });
        const chainId$ = hot<Cardano.ChainId>('a', {
          a: Cardano.ChainIds.Preprod,
        });
        // Operations stay pending forever -> only the 60_000ms timer can win
        // the race and release the round.
        const selectIsSyncOperationPending$ = hot('a', {
          a: (_opId: SyncOperationId) => true,
        });

        return {
          actionObservables: {},
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            cardanoContext: { selectChainId$: chainId$ },
            sync: { selectIsSyncOperationPending$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            // Round 1 dispatches at frame 0; the 60s timeout releases the lock,
            // so the second trigger's round dispatches account1 afterwards.
            expectObservable(sideEffect$).toBe('a 60001ms b', {
              a: actions.sync.addSyncOperation({
                accountId: account0.accountId,
                operation: syntheticOperation(account0),
              }),
              b: actions.sync.addSyncOperation({
                accountId: account1.accountId,
                operation: syntheticOperation(account1),
              }),
            });
          },
        };
      },
    );
  });
});
