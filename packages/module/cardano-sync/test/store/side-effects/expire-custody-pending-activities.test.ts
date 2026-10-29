import { Cardano } from '@cardano-sdk/core';
import { activitiesActions, ActivityType } from '@lace-contract/activities';
import { UTXO_SYNC_CONFIRMATION_DEPTH } from '@lace-contract/cardano-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { expireCustodyPendingActivities } from '../../../src/store/side-effects/expire-custody-pending-activities';

import type { Activity } from '@lace-contract/activities';
import type {
  AccountUtxoMap,
  CardanoAccountTransactionsHistoryMap,
  CardanoTransactionHistoryItem,
  cardanoCustodyActivityMetadataOf,
} from '@lace-contract/cardano-context';
import type { AccountSyncStatus } from '@lace-contract/sync';

const actions = { ...activitiesActions };

const CUSTODY_ACCOUNT = AccountId('custody-account');
const KEY_ACCOUNT = AccountId('key-account');
const BOUND = 1_000;
const EXPIRED_SLOT = BOUND + UTXO_SYNC_CONFIRMATION_DEPTH + 1;

const txId = (byte: string) => Cardano.TransactionId(byte.repeat(32));
const CUSTODY_TX = txId('c1');
const OTHER_CUSTODY_TX = txId('c2');
const KEY_TX = txId('d1');

const tipAt = (slot: number): Cardano.Tip => ({
  slot: Cardano.Slot(slot),
  blockNo: Cardano.BlockNo(slot),
  hash: Cardano.BlockId(slot.toString(16).padStart(64, '0')),
});

const pending = (
  accountId: AccountId,
  activityId: Cardano.TransactionId,
  invalidHereafter?: number,
): Activity => {
  const custody: ReturnType<typeof cardanoCustodyActivityMetadataOf> =
    invalidHereafter === undefined
      ? undefined
      : {
          invalidHereafter: Cardano.Slot(invalidHereafter),
          operation: 'owner-spend',
          status: 'pending',
        };
  return {
    accountId,
    activityId,
    timestamp: Timestamp(0),
    tokenBalanceChanges: [],
    type: ActivityType.Pending,
    blockchainSpecific: {
      Cardano: {
        consumedInputs: [],
        producedOutputs: [],
        ...(custody && { custody }),
      },
    } as Activity['blockchainSpecific'],
  };
};

const custodyPending = pending(CUSTODY_ACCOUNT, CUSTODY_TX, BOUND);
const laterCustodyPending = pending(
  CUSTODY_ACCOUNT,
  OTHER_CUSTODY_TX,
  BOUND + 500,
);
const keyPending = pending(KEY_ACCOUNT, KEY_TX);

const historyItem = (id: Cardano.TransactionId) =>
  ({
    txId: id,
    blockNumber: 1,
    txIndex: 0,
  } as unknown as CardanoTransactionHistoryItem);

const settledOutput = (id: Cardano.TransactionId): Cardano.Utxo => {
  const address = Cardano.PaymentAddress(
    'addr_test1vz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzerspjrlsz',
  );
  return [
    { txId: id, index: 0, address },
    { address, value: { coins: 2_000_000n } },
  ];
};

/** An account between sync rounds, last synced at `lastSuccessfulSync`. */
const idle = (lastSuccessfulSync: number): AccountSyncStatus => ({
  lastSuccessfulSync: Timestamp(lastSuccessfulSync),
});

/** An account whose round started at `startedAt` is in progress. */
const syncing = (
  startedAt: number,
  lastSuccessfulSync: number,
): AccountSyncStatus => ({
  lastSuccessfulSync: Timestamp(lastSuccessfulSync),
  pendingSync: { startedAt: Timestamp(startedAt), operations: {} },
});

/** Sync statuses where only the custody account has an entry. */
const custodyStatus = (status: AccountSyncStatus) => ({
  [CUSTODY_ACCOUNT]: status,
});

/**
 * The custody account syncs one round: idle since 1, a round that starts
 * at 2, and completes successfully at 3.
 */
const ONE_ROUND = {
  a: custodyStatus(idle(1)),
  b: custodyStatus(syncing(2, 1)),
  c: custodyStatus(idle(3)),
};

const removal = (accountId: AccountId, activityIds: string[]) =>
  actions.activities.removeActivities({ accountId, activityIds });

const emptyUtxos = { a: {} } as { a: AccountUtxoMap };
const emptyHistory = { a: {} } as { a: CardanoAccountTransactionsHistoryMap };

describe('expireCustodyPendingActivities', () => {
  it('drops a custody operation once a round that started past its bound completes', () => {
    testSideEffect(
      expireCustodyPendingActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {},
        stateObservables: {
          cardanoContext: {
            selectTip$: cold('a', { a: tipAt(EXPIRED_SLOT) }),
            selectAccountUtxos$: cold('a', emptyUtxos),
            selectTransactionHistoryGroupedByAccount$: cold('a', emptyHistory),
          },
          activities: {
            selectPendingActivitiesByAccount$: cold('a', {
              a: {
                [CUSTODY_ACCOUNT]: [custodyPending, laterCustodyPending],
                [KEY_ACCOUNT]: [keyPending],
              },
            }),
          },
          sync: { selectSyncStatusByAccount$: cold('a-b-c', ONE_ROUND) },
        },
        dependencies: { actions, isWalletActive$: cold('t', { t: true }) },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$, '^-----!').toBe('----a', {
            a: removal(CUSTODY_ACCOUNT, [CUSTODY_TX]),
          });
        },
      }),
    );
  });

  it('keeps an operation while the only round completed since the tip passed its bound started before', () => {
    testSideEffect(
      expireCustodyPendingActivities,
      ({ cold, hot, expectObservable }) => ({
        actionObservables: {},
        stateObservables: {
          cardanoContext: {
            // The tip jumps past the bound while a round runs, as it does
            // when the wallet resumes or the provider lags. Hot streams start
            // a frame late, after the side effect subscribed.
            selectTip$: hot('-a---b', {
              a: tipAt(BOUND + UTXO_SYNC_CONFIRMATION_DEPTH),
              b: tipAt(EXPIRED_SLOT + 100),
            }),
            selectAccountUtxos$: cold('a', emptyUtxos),
            selectTransactionHistoryGroupedByAccount$: cold('a', emptyHistory),
          },
          activities: {
            selectPendingActivitiesByAccount$: cold('a', {
              a: { [CUSTODY_ACCOUNT]: [custodyPending] },
            }),
          },
          sync: {
            selectSyncStatusByAccount$: hot('-a-b---c-d-e', {
              ...ONE_ROUND,
              d: custodyStatus(syncing(4, 3)),
              e: custodyStatus(idle(5)),
            }),
          },
        },
        dependencies: { actions, isWalletActive$: cold('t', { t: true }) },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$, '^------------!').toBe('-----------a', {
            a: removal(CUSTODY_ACCOUNT, [CUSTODY_TX]),
          });
        },
      }),
    );
  });

  it.each([
    ['fails', custodyStatus({ ...idle(1), lastFailedSync: Timestamp(3) })],
    ['is dropped', custodyStatus(idle(1))],
  ])('does not count a round that %s', (_, ended) => {
    testSideEffect(
      expireCustodyPendingActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {},
        stateObservables: {
          cardanoContext: {
            selectTip$: cold('a', { a: tipAt(EXPIRED_SLOT) }),
            selectAccountUtxos$: cold('a', emptyUtxos),
            selectTransactionHistoryGroupedByAccount$: cold('a', emptyHistory),
          },
          activities: {
            selectPendingActivitiesByAccount$: cold('a', {
              a: { [CUSTODY_ACCOUNT]: [custodyPending] },
            }),
          },
          sync: {
            selectSyncStatusByAccount$: cold('a-b-c', {
              ...ONE_ROUND,
              c: ended,
            }),
          },
        },
        dependencies: { actions, isWalletActive$: cold('t', { t: true }) },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$, '^-----!').toBe('');
        },
      }),
    );
  });

  it('does not count a round already running when it first saw the account', () => {
    testSideEffect(
      expireCustodyPendingActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {},
        stateObservables: {
          cardanoContext: {
            selectTip$: cold('a', { a: tipAt(EXPIRED_SLOT) }),
            selectAccountUtxos$: cold('a', emptyUtxos),
            selectTransactionHistoryGroupedByAccount$: cold('a', emptyHistory),
          },
          activities: {
            selectPendingActivitiesByAccount$: cold('a', {
              a: { [CUSTODY_ACCOUNT]: [custodyPending] },
            }),
          },
          sync: {
            selectSyncStatusByAccount$: cold('b-c', ONE_ROUND),
          },
        },
        dependencies: { actions, isWalletActive$: cold('t', { t: true }) },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$, '^---!').toBe('');
        },
      }),
    );
  });

  it('counts the first round of an account that appears after the first state', () => {
    testSideEffect(
      expireCustodyPendingActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {},
        stateObservables: {
          cardanoContext: {
            selectTip$: cold('a', { a: tipAt(EXPIRED_SLOT) }),
            selectAccountUtxos$: cold('a', emptyUtxos),
            selectTransactionHistoryGroupedByAccount$: cold('a', emptyHistory),
          },
          activities: {
            selectPendingActivitiesByAccount$: cold('a', {
              a: { [CUSTODY_ACCOUNT]: [custodyPending] },
            }),
          },
          sync: {
            selectSyncStatusByAccount$: cold('a-b-c', {
              a: {},
              b: custodyStatus({
                pendingSync: { startedAt: Timestamp(2), operations: {} },
              }),
              c: ONE_ROUND.c,
            }),
          },
        },
        dependencies: { actions, isWalletActive$: cold('t', { t: true }) },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$, '^-----!').toBe('----a', {
            a: removal(CUSTODY_ACCOUNT, [CUSTODY_TX]),
          });
        },
      }),
    );
  });

  it('keeps an operation the history or the synced UTxOs show settled', () => {
    testSideEffect(
      expireCustodyPendingActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {},
        stateObservables: {
          cardanoContext: {
            selectTip$: cold('a', { a: tipAt(EXPIRED_SLOT + 1_000) }),
            selectAccountUtxos$: cold('a', {
              a: { [CUSTODY_ACCOUNT]: [settledOutput(OTHER_CUSTODY_TX)] },
            } as { a: AccountUtxoMap }),
            selectTransactionHistoryGroupedByAccount$: cold('a', {
              a: { [CUSTODY_ACCOUNT]: [historyItem(CUSTODY_TX)] },
            } as { a: CardanoAccountTransactionsHistoryMap }),
          },
          activities: {
            selectPendingActivitiesByAccount$: cold('a', {
              a: { [CUSTODY_ACCOUNT]: [custodyPending, laterCustodyPending] },
            }),
          },
          sync: { selectSyncStatusByAccount$: cold('a-b-c', ONE_ROUND) },
        },
        dependencies: { actions, isWalletActive$: cold('t', { t: true }) },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$, '^-----!').toBe('');
        },
      }),
    );
  });

  it('never drops a pending activity without a custody bound', () => {
    testSideEffect(
      expireCustodyPendingActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {},
        stateObservables: {
          cardanoContext: {
            selectTip$: cold('a', { a: tipAt(EXPIRED_SLOT * 100) }),
            selectAccountUtxos$: cold('a', emptyUtxos),
            selectTransactionHistoryGroupedByAccount$: cold('a', emptyHistory),
          },
          activities: {
            selectPendingActivitiesByAccount$: cold('a', {
              a: { [KEY_ACCOUNT]: [keyPending] },
            }),
          },
          sync: {
            selectSyncStatusByAccount$: cold('a-b-c', {
              a: { [KEY_ACCOUNT]: idle(1) },
              b: { [KEY_ACCOUNT]: syncing(2, 1) },
              c: { [KEY_ACCOUNT]: idle(3) },
            }),
          },
        },
        dependencies: { actions, isWalletActive$: cold('t', { t: true }) },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$, '^-----!').toBe('');
        },
      }),
    );
  });

  it('does not count a round that started before a tip was known', () => {
    testSideEffect(
      expireCustodyPendingActivities,
      ({ cold, hot, expectObservable }) => ({
        actionObservables: {},
        stateObservables: {
          cardanoContext: {
            selectTip$: hot('-a---b', { a: undefined, b: tipAt(EXPIRED_SLOT) }),
            selectAccountUtxos$: cold('a', emptyUtxos),
            selectTransactionHistoryGroupedByAccount$: cold('a', emptyHistory),
          },
          activities: {
            selectPendingActivitiesByAccount$: cold('a', {
              a: { [CUSTODY_ACCOUNT]: [custodyPending] },
            }),
          },
          sync: { selectSyncStatusByAccount$: hot('-a-b---c', ONE_ROUND) },
        },
        dependencies: { actions, isWalletActive$: cold('t', { t: true }) },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$, '^---------!').toBe('');
        },
      }),
    );
  });

  it('drops the stale operations of every account, one removal per account', () => {
    const OTHER_ACCOUNT = AccountId('other-custody-account');
    const otherPending = pending(OTHER_ACCOUNT, txId('e1'), BOUND);
    testSideEffect(
      expireCustodyPendingActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {},
        stateObservables: {
          cardanoContext: {
            selectTip$: cold('a', { a: tipAt(EXPIRED_SLOT + 500) }),
            selectAccountUtxos$: cold('a', emptyUtxos),
            selectTransactionHistoryGroupedByAccount$: cold('a', emptyHistory),
          },
          activities: {
            selectPendingActivitiesByAccount$: cold('a', {
              a: {
                [CUSTODY_ACCOUNT]: [custodyPending, laterCustodyPending],
                [OTHER_ACCOUNT]: [otherPending],
                [KEY_ACCOUNT]: [keyPending],
              },
            }),
          },
          sync: {
            selectSyncStatusByAccount$: cold('a-b-c', {
              a: { [CUSTODY_ACCOUNT]: idle(1), [OTHER_ACCOUNT]: idle(1) },
              b: {
                [CUSTODY_ACCOUNT]: syncing(2, 1),
                [OTHER_ACCOUNT]: syncing(2, 1),
              },
              c: { [CUSTODY_ACCOUNT]: idle(3), [OTHER_ACCOUNT]: idle(3) },
            }),
          },
        },
        dependencies: { actions, isWalletActive$: cold('t', { t: true }) },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$, '^-----!').toBe('----(ab)', {
            a: removal(CUSTODY_ACCOUNT, [CUSTODY_TX, OTHER_CUSTODY_TX]),
            b: removal(OTHER_ACCOUNT, [otherPending.activityId]),
          });
        },
      }),
    );
  });

  describe('while the wallet is locked (ADR 29)', () => {
    it('drops nothing while the wallet is inactive', () => {
      testSideEffect(
        expireCustodyPendingActivities,
        ({ cold, hot, expectObservable }) => ({
          actionObservables: {},
          stateObservables: {
            cardanoContext: {
              selectTip$: cold('a', { a: tipAt(EXPIRED_SLOT) }),
              selectAccountUtxos$: cold('a', emptyUtxos),
              selectTransactionHistoryGroupedByAccount$: cold(
                'a',
                emptyHistory,
              ),
            },
            activities: {
              selectPendingActivitiesByAccount$: cold('a', {
                a: { [CUSTODY_ACCOUNT]: [custodyPending] },
              }),
            },
            sync: { selectSyncStatusByAccount$: cold('a-b-c', ONE_ROUND) },
          },
          dependencies: { actions, isWalletActive$: hot('f', { f: false }) },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, '^-----!').toBe('');
          },
        }),
      );
    });

    it('starts afresh on unlock and waits for a round that runs after it', () => {
      testSideEffect(
        expireCustodyPendingActivities,
        ({ cold, hot, expectObservable }) => ({
          actionObservables: {},
          stateObservables: {
            // Cold streams start at the subscription, as the replayed state
            // does: the first sync status at unlock is the one before it.
            cardanoContext: {
              selectTip$: cold('a', { a: tipAt(EXPIRED_SLOT) }),
              selectAccountUtxos$: cold('a', emptyUtxos),
              selectTransactionHistoryGroupedByAccount$: cold(
                'a',
                emptyHistory,
              ),
            },
            activities: {
              selectPendingActivitiesByAccount$: cold('a', {
                a: { [CUSTODY_ACCOUNT]: [custodyPending] },
              }),
            },
            sync: { selectSyncStatusByAccount$: cold('a-b-c', ONE_ROUND) },
          },
          dependencies: {
            actions,
            isWalletActive$: hot('f--t', { f: false, t: true }),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, '^--------!').toBe('-------a', {
              a: removal(CUSTODY_ACCOUNT, [CUSTODY_TX]),
            });
          },
        }),
      );
    });
  });
});
