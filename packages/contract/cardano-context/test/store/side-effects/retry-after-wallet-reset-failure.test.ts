import { syncActions } from '@lace-contract/sync';
import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { map, NEVER } from 'rxjs';
import { describe, it } from 'vitest';

import { cardanoContextActions } from '../../../src/store';
import { retryAfterWalletResetFailure } from '../../../src/store/side-effects/retry-after-wallet-reset-failure';

import type { SideEffect } from '../../../src/contract';

const accountId = AccountId('reset-account');
const otherId = AccountId('other-account');
const actions = { ...cardanoContextActions, ...syncActions };
const retry: SideEffect = (observables, _, { actions }) =>
  retryAfterWalletResetFailure(accountId, observables).pipe(
    map(() => actions.cardanoContext.refetchAccountUtxos({ accountId })),
  );
const completed = (
  id = accountId,
  operationId = 'ordinary-transaction-polling',
) => actions.sync.completeSyncOperation({ accountId: id, operationId });
const failed = (id = accountId) =>
  actions.cardanoContext.setWalletSyncResetResult({
    accountId: id,
    status: 'Failed',
  });

describe('resume derived work after reset failure', () => {
  it('retries once after this account fails and completes polling, ignoring unrelated work', () => {
    testSideEffect(retry, ({ hot, expectObservable }) => ({
      actionObservables: {
        cardanoContext: {
          setWalletSyncResetResult$: hot('--ab', {
            a: failed(otherId),
            b: failed(),
          }),
          resetWalletSyncState$: NEVER,
        },
        sync: {
          clearPendingSyncsForAccounts$: NEVER,
          completeSyncOperation$: hot('a---bcd-a', {
            a: completed(),
            b: completed(otherId),
            c: completed(accountId, 'discovery-address-discovery'),
            d: completed(),
          }),
        },
      },
      dependencies: { actions },
      assertion: source => {
        expectObservable(source).toBe('------a', {
          a: actions.cardanoContext.refetchAccountUtxos({ accountId }),
        });
      },
    }));
  });

  it.each(['retry', 'clear', 'other-retry', 'other-clear'])(
    'cancels the deferred recovery only for an affected account (%s)',
    reason => {
      testSideEffect(retry, ({ hot, expectObservable }) => ({
        actionObservables: {
          cardanoContext: {
            setWalletSyncResetResult$: hot('-a', { a: failed() }),
            resetWalletSyncState$: reason.endsWith('retry')
              ? hot('--a', {
                  a: actions.cardanoContext.resetWalletSyncState({
                    accountId: reason.startsWith('other') ? otherId : accountId,
                  }),
                })
              : NEVER,
          },
          sync: {
            clearPendingSyncsForAccounts$: reason.endsWith('clear')
              ? hot('--a', {
                  a: actions.sync.clearPendingSyncsForAccounts({
                    accountIds: [
                      reason.startsWith('other') ? otherId : accountId,
                    ],
                  }),
                })
              : NEVER,
            completeSyncOperation$: hot('---a', { a: completed() }),
          },
        },
        dependencies: { actions },
        assertion: source => {
          expectObservable(source).toBe(
            reason.startsWith('other') ? '---a' : '-',
            { a: actions.cardanoContext.refetchAccountUtxos({ accountId }) },
          );
        },
      }));
    },
  );

  it('does not restart normal work after a successful reset', () => {
    testSideEffect(retry, ({ hot, expectObservable }) => ({
      actionObservables: {
        cardanoContext: {
          setWalletSyncResetResult$: hot('-a', {
            a: actions.cardanoContext.setWalletSyncResetResult({
              accountId,
              status: 'Completed',
            }),
          }),
          resetWalletSyncState$: NEVER,
        },
        sync: {
          clearPendingSyncsForAccounts$: NEVER,
          completeSyncOperation$: hot('--a', { a: completed() }),
        },
      },
      dependencies: { actions },
      assertion: source => {
        expectObservable(source).toBe('-');
      },
    }));
  });
});
