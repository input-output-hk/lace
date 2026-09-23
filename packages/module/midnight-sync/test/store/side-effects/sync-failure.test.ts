import { failuresActions } from '@lace-contract/failures';
import { syncActions } from '@lace-contract/sync';
import { Timestamp } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import {
  autoDismissMidnightSyncFailureOnResume,
  autoDismissMidnightSyncFailureOnSyncSuccess,
} from '../../../src/store/side-effects/sync-failure';
import { MidnightSyncFailureId } from '../../../src/value-objects/midnight-sync-failure-id.vo';

import type { Failure } from '@lace-contract/failures';
import type {
  AnyWallet,
  AccountId,
  WalletId,
} from '@lace-contract/wallet-repo';

const midnightAccountId = 'midnight-account-1' as AccountId;
const siblingAccountId = 'midnight-account-2' as AccountId;
const cardanoAccountId = 'cardano-account-1' as AccountId;

const failureOf = (accountId: AccountId): Failure =>
  ({
    failureId: MidnightSyncFailureId(accountId),
    message: 'sync.error.midnight-sync-failed',
    timestamp: Timestamp(0),
  } as unknown as Failure);

const selectFailureFor =
  (...accountIds: AccountId[]) =>
  (id: string) =>
    accountIds
      .map(accountId => failureOf(accountId))
      .find(failure => failure.failureId === id);

const midnightAccount = (accountId: AccountId) => ({
  accountId,
  blockchainName: 'Midnight',
  accountType: 'InMemory',
  blockchainSpecific: {},
});

const walletWith = (...accountIds: AccountId[]): AnyWallet[] =>
  [
    {
      walletId: 'wallet-1' as WalletId,
      accounts: accountIds.map(midnightAccount),
    },
  ] as unknown as AnyWallet[];

describe('autoDismissMidnightSyncFailureOnSyncSuccess', () => {
  it('dismisses the failure of the account whose sync completed', () => {
    testSideEffect(
      autoDismissMidnightSyncFailureOnSyncSuccess,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          sync: {
            completeSyncOperation$: cold('a', {
              a: syncActions.sync.completeSyncOperation({
                accountId: midnightAccountId,
                operationId: `${midnightAccountId}-midnight-sync`,
              }),
            }),
          },
        },
        stateObservables: {
          failures: {
            selectFailureById$: cold('a', {
              a: selectFailureFor(midnightAccountId),
            }),
          },
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: failuresActions.failures.dismissFailure(
              MidnightSyncFailureId(midnightAccountId),
            ),
          });
        },
      }),
    );
  });

  it('leaves a still-broken account alone when a sibling recovers', () => {
    testSideEffect(
      autoDismissMidnightSyncFailureOnSyncSuccess,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          sync: {
            completeSyncOperation$: cold('a', {
              a: syncActions.sync.completeSyncOperation({
                accountId: siblingAccountId,
                operationId: `${siblingAccountId}-midnight-sync`,
              }),
            }),
          },
        },
        stateObservables: {
          failures: {
            // Only the first account is broken; the sibling has no failure.
            selectFailureById$: cold('a', {
              a: selectFailureFor(midnightAccountId),
            }),
          },
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
        },
      }),
    );
  });

  it('ignores a completion for a non-Midnight account', () => {
    testSideEffect(
      autoDismissMidnightSyncFailureOnSyncSuccess,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          sync: {
            completeSyncOperation$: cold('a', {
              a: syncActions.sync.completeSyncOperation({
                accountId: cardanoAccountId,
                operationId: `${cardanoAccountId}-cardano-sync`,
              }),
            }),
          },
        },
        stateObservables: {
          failures: {
            selectFailureById$: cold('a', {
              a: selectFailureFor(midnightAccountId),
            }),
          },
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
        },
      }),
    );
  });
});

describe('autoDismissMidnightSyncFailureOnResume', () => {
  it('dismisses every Midnight account failure held at resume', () => {
    testSideEffect(
      autoDismissMidnightSyncFailureOnResume,
      ({ cold, expectObservable }) => ({
        stateObservables: {
          wallets: {
            selectAll$: cold('a', {
              a: walletWith(midnightAccountId, siblingAccountId),
            }),
          },
          failures: {
            selectFailureById$: cold('a', {
              a: selectFailureFor(midnightAccountId, siblingAccountId),
            }),
          },
        },
        dependencies: {
          walletResumed$: cold('-a', { a: undefined }),
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(ab)', {
            a: failuresActions.failures.dismissFailure(
              MidnightSyncFailureId(midnightAccountId),
            ),
            b: failuresActions.failures.dismissFailure(
              MidnightSyncFailureId(siblingAccountId),
            ),
          });
        },
      }),
    );
  });

  it('emits nothing when no Midnight account holds a failure', () => {
    testSideEffect(
      autoDismissMidnightSyncFailureOnResume,
      ({ cold, expectObservable }) => ({
        stateObservables: {
          wallets: {
            selectAll$: cold('a', {
              a: walletWith(midnightAccountId),
            }),
          },
          failures: {
            selectFailureById$: cold('a', { a: () => undefined }),
          },
        },
        dependencies: {
          walletResumed$: cold('-a', { a: undefined }),
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
        },
      }),
    );
  });
});
