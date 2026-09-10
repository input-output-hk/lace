import { failuresActions } from '@lace-contract/failures';
import { AccountId } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { of } from 'rxjs';
import { describe, it } from 'vitest';

import { CardanoSyncFailureId } from '../../../src';
import { cardanoContextActions } from '../../../src/store';
import { trackSyncRoundFailures } from '../../../src/store/side-effects/track-sync-round-failures';

import type { Failure, FailureId } from '@lace-contract/failures';
import type { AccountSyncStatus } from '@lace-contract/sync';

type SyncStatusByAccount = Record<AccountId, AccountSyncStatus>;

const actions = {
  ...failuresActions,
  ...cardanoContextActions,
};

describe('trackSyncRoundFailures', () => {
  const accountId1 = AccountId('account-1');
  const now = Timestamp(Date.now());

  describe('failure detection', () => {
    it('should add failure when sync round fails (pendingSync cleared, lastFailedSync updated)', () => {
      testSideEffect(trackSyncRoundFailures, ({ hot, expectObservable }) => {
        // Initial state: account has pending sync
        const initialState: SyncStatusByAccount = {
          [accountId1]: {
            pendingSync: {
              startedAt: now,
              operations: {},
            },
            lastSuccessfulSync: now,
          },
        };

        // Next state: pending sync cleared and the round recorded as failed
        const failedState: SyncStatusByAccount = {
          [accountId1]: {
            pendingSync: undefined, // ← Cleared
            lastSuccessfulSync: now, // ← Same timestamp (not updated)
            lastFailedSync: Timestamp(now + 1000), // ← Round resolved as failed
          },
        };

        const selectSyncStatusByAccount$ = hot<SyncStatusByAccount>('ab', {
          a: initialState,
          b: failedState,
        });

        const selectFailureById$ = hot('a', {
          a: () => undefined, // No existing failure
        });

        return {
          actionObservables: {},
          stateObservables: {
            sync: { selectSyncStatusByAccount$ },
            failures: { selectFailureById$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.failures.addFailure({
                failureId: CardanoSyncFailureId(accountId1),
                message: 'sync.error.cardano-sync-round-failed',
                retryAction: actions.cardanoContext.retrySyncRound(),
              }),
            });
          },
        };
      });
    });

    it('should not emit anything when pendingSync remains defined', () => {
      testSideEffect(trackSyncRoundFailures, ({ hot, expectObservable }) => {
        // Both states have pendingSync defined (sync in progress)
        const state1: SyncStatusByAccount = {
          [accountId1]: {
            pendingSync: {
              startedAt: now,
              operations: {},
            },
            lastSuccessfulSync: now,
          },
        };

        const state2: SyncStatusByAccount = {
          [accountId1]: {
            pendingSync: {
              startedAt: now,
              operations: {},
            },
            lastSuccessfulSync: now,
          },
        };

        const selectSyncStatusByAccount$ = hot<SyncStatusByAccount>('ab', {
          a: state1,
          b: state2,
        });

        const selectFailureById$ = hot('a', {
          a: () => undefined,
        });

        return {
          actionObservables: {},
          stateObservables: {
            sync: { selectSyncStatusByAccount$ },
            failures: { selectFailureById$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('--'); // No emissions
          },
        };
      });
    });
  });

  describe('deliberate clear', () => {
    const pendingRound = {
      pendingSync: {
        startedAt: now,
        operations: {},
      },
    };

    // `clearPendingSyncsForAccounts` on unlock / network switch drops the round
    // without resolving it. Reading that as a failure makes the portfolio's
    // initial-load gate treat the network as settled and render the empty
    // state instead of the skeleton.
    const droppedRoundCases: Array<
      [string, AccountSyncStatus, AccountSyncStatus]
    > = [
      [
        'a never-synced account (lock mid-sync, then unlock)',
        pendingRound,
        { pendingSync: undefined },
      ],
      [
        'an account that synced on this network before (switch network and back)',
        { ...pendingRound, lastSuccessfulSync: now },
        { pendingSync: undefined, lastSuccessfulSync: now },
      ],
      [
        'an account whose previous round had already failed',
        { ...pendingRound, lastFailedSync: now },
        { pendingSync: undefined, lastFailedSync: now },
      ],
    ];

    it.each(droppedRoundCases)(
      'should not record a failure when the round is dropped for %s',
      (_label, previousStatus, currentStatus) => {
        testSideEffect(trackSyncRoundFailures, ({ hot, expectObservable }) => {
          const selectSyncStatusByAccount$ = hot<SyncStatusByAccount>('ab', {
            a: { [accountId1]: previousStatus },
            b: { [accountId1]: currentStatus },
          });

          const selectFailureById$ = hot('a', {
            a: () => undefined,
          });

          return {
            actionObservables: {},
            stateObservables: {
              sync: { selectSyncStatusByAccount$ },
              failures: { selectFailureById$ },
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('--');
            },
          };
        });
      },
    );
  });

  describe('failure dismissal', () => {
    it('should dismiss failure when sync round succeeds (pendingSync cleared, lastSuccessfulSync updated)', () => {
      testSideEffect(trackSyncRoundFailures, ({ hot, expectObservable }) => {
        const newTimestamp = Timestamp(now + 1000);

        // Initial state: account has pending sync
        const initialState: SyncStatusByAccount = {
          [accountId1]: {
            pendingSync: {
              startedAt: now,
              operations: {},
            },
            lastSuccessfulSync: now,
          },
        };

        // Next state: pending sync cleared AND lastSuccessfulSync updated (success!)
        const successState: SyncStatusByAccount = {
          [accountId1]: {
            pendingSync: undefined, // ← Cleared
            lastSuccessfulSync: newTimestamp, // ← Updated timestamp
          },
        };

        const selectSyncStatusByAccount$ = hot<SyncStatusByAccount>('ab', {
          a: initialState,
          b: successState,
        });

        // Use of() for immediate synchronous emission (withLatestFrom requires this)
        const selectFailureById$ = of(
          (failureId: FailureId): Failure => ({
            failureId,
            message: 'sync.error.cardano-sync-round-failed',
            retryAction: actions.cardanoContext.retrySyncRound(),
          }),
        );

        return {
          actionObservables: {},
          stateObservables: {
            sync: { selectSyncStatusByAccount$ },
            failures: { selectFailureById$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.failures.dismissFailure(
                CardanoSyncFailureId(accountId1),
              ),
            });
          },
        };
      });
    });
  });
});
