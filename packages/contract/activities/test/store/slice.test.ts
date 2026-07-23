import { TokenId } from '@lace-contract/tokens';
import {
  AccountId,
  WalletId,
  walletsActions,
} from '@lace-contract/wallet-repo';
import { BigNumber, Timestamp } from '@lace-lib/util';
import { Serializable } from '@lace-lib/util-store';
import { REHYDRATE } from 'redux-persist';
import { describe, expect, it } from 'vitest';

import {
  ACTIVITIES_PER_PAGE,
  activitiesActions as actions,
  ActivitiesPaginationFailureId,
  ActivityType,
  MAX_ACTIVITIES_PER_ACCOUNT,
} from '../../src/index';
import { activitiesReducers, activitiesSelectors } from '../../src/store/slice';

import type { ActivitiesSliceState } from '../../src/store/slice';
import type { ActivityDetail } from '../../src/types';
import type { Failure } from '@lace-contract/failures';

describe('activities slice', () => {
  const initialState: ActivitiesSliceState = {
    activities: {},
    desiredLoadedActivitiesCountPerAccount: {},
    hasLoadedOldestEntry: {},
  };
  const accountId = AccountId('account1');
  const account2Id = AccountId('account2');
  const activity1 = {
    accountId,
    activityId: 'activity1',
    timestamp: Timestamp(1746526784955),
    tokenBalanceChanges: [{ tokenId: TokenId('tDust'), amount: BigNumber(0n) }],
    type: ActivityType.Send,
  };
  const activity2 = {
    accountId: account2Id,
    activityId: 'activity2',
    timestamp: Timestamp(1746526784956),
    tokenBalanceChanges: [{ tokenId: TokenId('other'), amount: BigNumber(0n) }],
    type: ActivityType.Send,
  };

  describe('reducers', () => {
    describe('setActivities', () => {
      it('sets activities', () => {
        const state = activitiesReducers.activities(
          initialState,
          actions.activities.setActivities({
            accountId,
            activities: [activity1],
          }),
        );
        expect(state.activities).toStrictEqual({
          [accountId]: [activity1],
        });
      });

      it('sets activities with different timestamp and sorts them', () => {
        const state = activitiesReducers.activities(
          initialState,
          actions.activities.setActivities({
            accountId,
            activities: [activity1, activity2],
          }),
        );

        expect(state.activities[accountId]).toStrictEqual([
          activity2,
          activity1,
        ]);
      });
    });

    describe('upsertActivities', () => {
      it('inserts new activities', () => {
        const state = activitiesReducers.activities(
          {
            activities: {
              [accountId]: [activity1],
            },
            desiredLoadedActivitiesCountPerAccount: {
              [accountId]: ACTIVITIES_PER_PAGE,
            },
            hasLoadedOldestEntry: {
              [accountId]: false,
            },
          },
          actions.activities.upsertActivities({
            accountId,
            activities: [activity2],
          }),
        );
        expect(state.activities).toStrictEqual({
          [accountId]: [activity2, activity1],
        });
      });

      it('updates existing activities', () => {
        const updatedActivity1 = {
          ...activity1,
          timestamp: Timestamp(activity1.timestamp + 2),
        };
        const state = activitiesReducers.activities(
          {
            activities: {
              [accountId]: [activity1],
            },
            desiredLoadedActivitiesCountPerAccount: {
              [accountId]: ACTIVITIES_PER_PAGE,
            },
            hasLoadedOldestEntry: {
              [accountId]: false,
            },
          },
          actions.activities.upsertActivities({
            accountId,
            activities: [activity2, updatedActivity1],
          }),
        );
        expect(state.activities).toStrictEqual({
          [accountId]: [updatedActivity1, activity2],
        });
      });
    });

    describe('resetActivities', () => {
      it('resets activities', () => {
        const state = activitiesReducers.activities(
          { ...initialState, activities: { [accountId]: [activity1] } },
          actions.activities.resetActivities({
            accountId,
          }),
        );
        expect(state.activities).toStrictEqual(initialState.activities);
      });
    });

    describe('setHasLoadedOldestEntry', () => {
      it('sets loading state', () => {
        const state = activitiesReducers.activities(
          initialState,
          actions.activities.setHasLoadedOldestEntry({
            accountId: accountId,
            hasLoadedOldestEntry: true,
          }),
        );
        expect(state.hasLoadedOldestEntry).toStrictEqual({
          [accountId]: true,
        });
      });
    });

    describe('clearActivities', () => {
      it('clears all activities', () => {
        const state = activitiesReducers.activities(
          { ...initialState, activities: { [accountId]: [activity1] } },
          actions.activities.clearActivities(),
        );
        expect(state.activities).toStrictEqual(initialState.activities);
      });
    });

    describe('setDesiredLoadedActivitiesCount', () => {
      it('sets desired loaded activities count for account', () => {
        const desiredCount = 15;
        const state = activitiesReducers.activities(
          initialState,
          actions.activities.setDesiredLoadedActivitiesCount({
            accountId,
            desiredLoadedActivitiesCount: desiredCount,
          }),
        );
        expect(state.desiredLoadedActivitiesCountPerAccount).toStrictEqual({
          [accountId]: desiredCount,
        });
      });
    });

    describe('incrementDesiredLoadedActivitiesCount', () => {
      it('increments desired loaded activities count', () => {
        const state = activitiesReducers.activities(
          initialState,
          actions.activities.incrementDesiredLoadedActivitiesCount({
            accountId,
          }),
        );
        expect(state.desiredLoadedActivitiesCountPerAccount).toStrictEqual({
          [accountId]: ACTIVITIES_PER_PAGE,
        });
      });

      it('increments desired loaded activities count for the same account', () => {
        const previousCount = 1;

        const state = activitiesReducers.activities(
          {
            ...initialState,
            activities: {
              // Simulate activity loaded previously
              [accountId]: [activity1],
            },
            desiredLoadedActivitiesCountPerAccount: {
              [accountId]: previousCount,
            },
          },
          actions.activities.incrementDesiredLoadedActivitiesCount({
            accountId,
          }),
        );
        expect(state.desiredLoadedActivitiesCountPerAccount).toStrictEqual({
          [accountId]: ACTIVITIES_PER_PAGE + previousCount,
        });
      });

      it('does not increment desired loaded activities while loading', () => {
        const previousCount = ACTIVITIES_PER_PAGE + 1;

        const state = activitiesReducers.activities(
          {
            ...initialState, // no activities loaded yet
            desiredLoadedActivitiesCountPerAccount: {
              [accountId]: previousCount,
            },
          },
          actions.activities.incrementDesiredLoadedActivitiesCount({
            accountId,
          }),
        );
        expect(state.desiredLoadedActivitiesCountPerAccount).toStrictEqual({
          [accountId]: previousCount,
        });
      });

      it('anchors increment on loaded count when desired has drifted behind', () => {
        // Newer-tx polling can populate `activities` before anyone has
        // incremented `desired`; anchoring on the larger of the two ensures
        // the first increment actually lifts desired above loaded and fires
        // a fetch, rather than just catching desired up to loaded.
        const state = activitiesReducers.activities(
          {
            ...initialState,
            activities: {
              [accountId]: [activity1, activity1, activity1],
            },
            desiredLoadedActivitiesCountPerAccount: {
              [accountId]: 0,
            },
          },
          actions.activities.incrementDesiredLoadedActivitiesCount({
            accountId,
          }),
        );
        expect(state.desiredLoadedActivitiesCountPerAccount).toStrictEqual({
          [accountId]: 3 + ACTIVITIES_PER_PAGE,
        });
      });

      // Immer must return the same state reference when the guard skips
      // the mutation. createStateObservables (packages/contract/module)
      // applies distinctUntilChanged to every selector, so consumers rely
      // on this identity to avoid spurious re-emissions.
      it('returns the same state reference when the guard skips the mutation', () => {
        const previousCount = ACTIVITIES_PER_PAGE + 1;
        const inputState = {
          ...initialState,
          desiredLoadedActivitiesCountPerAccount: {
            [accountId]: previousCount,
          },
        };

        const state = activitiesReducers.activities(
          inputState,
          actions.activities.incrementDesiredLoadedActivitiesCount({
            accountId,
            incrementBy: 0,
          }),
        );

        expect(state).toBe(inputState);
        expect(state.desiredLoadedActivitiesCountPerAccount).toBe(
          inputState.desiredLoadedActivitiesCountPerAccount,
        );
      });
    });

    describe('REHYDRATE extraReducer', () => {
      it('should handle REHYDRATE action with activities key and payload', () => {
        const rehydrateAction = {
          type: REHYDRATE,
          key: 'activities',
          payload: {
            activities: {
              [accountId]: [activity1, activity2],
              [account2Id]: [activity2],
            },
          },
        };

        const state = activitiesReducers.activities(
          initialState,
          rehydrateAction,
        );

        expect(state.desiredLoadedActivitiesCountPerAccount).toStrictEqual({
          [accountId]: 2,
          [account2Id]: 1,
        });
      });

      it('should set hasLoadedOldestEntry to false when activities count equals MAX_ACTIVITIES_PER_ACCOUNT', () => {
        const maxActivities = Array.from(
          { length: MAX_ACTIVITIES_PER_ACCOUNT },
          (_, index) => ({ ...activity1, activityId: `id-${index}` }),
        );
        const rehydrateAction = {
          type: REHYDRATE,
          key: 'activities',
          payload: {
            activities: {
              [accountId]: maxActivities,
            },
          },
        };

        const state = activitiesReducers.activities(
          initialState,
          rehydrateAction,
        );

        expect(state.hasLoadedOldestEntry).toStrictEqual({
          [accountId]: false,
        });
      });

      it('should not modify state when REHYDRATE action has different key', () => {
        const rehydrateAction = {
          type: REHYDRATE,
          key: 'different-key',
          payload: {
            activities: {
              [accountId]: [activity1, activity2],
            },
          },
        };

        const state = activitiesReducers.activities(
          initialState,
          rehydrateAction,
        );

        expect(state).toStrictEqual(initialState);
      });

      it('should not modify state when REHYDRATE action has no payload', () => {
        const rehydrateAction = {
          type: REHYDRATE,
          key: 'activities',
          payload: null,
        };

        const state = activitiesReducers.activities(
          initialState,
          rehydrateAction,
        );

        expect(state).toStrictEqual(initialState);
      });

      it('should handle REHYDRATE action with empty activities', () => {
        const rehydrateAction = {
          type: REHYDRATE,
          key: 'activities',
          payload: {
            activities: {},
          },
        };

        const state = activitiesReducers.activities(
          initialState,
          rehydrateAction,
        );

        expect(state.desiredLoadedActivitiesCountPerAccount).toStrictEqual({});
      });

      it('restores desiredLoadedActivitiesCountPerAccount from the payload hint instead of the (shrunken) activities length', () => {
        const rehydrateAction = {
          type: REHYDRATE,
          key: 'activities',
          payload: {
            activities: {
              [accountId]: [activity1], // 1 survives after the migration drops rewards
            },
            desiredLoadedActivitiesCountPerAccount: {
              [accountId]: 4, // pre-migration count: 1 tx + 3 dropped rewards
            },
          },
        };

        const state = activitiesReducers.activities(
          initialState,
          rehydrateAction,
        );

        expect(state.desiredLoadedActivitiesCountPerAccount).toStrictEqual({
          [accountId]: 4,
        });
      });

      it('falls back to activities length for accounts missing from the payload hint', () => {
        const rehydrateAction = {
          type: REHYDRATE,
          key: 'activities',
          payload: {
            activities: {
              [accountId]: [activity1],
              [account2Id]: [
                activity2,
                { ...activity2, activityId: 'activity2b' },
              ],
            },
            desiredLoadedActivitiesCountPerAccount: {
              [accountId]: 4,
            },
          },
        };

        const state = activitiesReducers.activities(
          initialState,
          rehydrateAction,
        );

        expect(state.desiredLoadedActivitiesCountPerAccount).toStrictEqual({
          [accountId]: 4,
          [account2Id]: 2,
        });
      });
    });

    describe('removeAccount extraReducer', () => {
      const walletId = WalletId('wallet1');
      const state = {
        ...initialState,
        activities: {
          [accountId]: [activity1],
          [account2Id]: [activity2],
        },
        desiredLoadedActivitiesCountPerAccount: {
          [accountId]: 1,
          [account2Id]: 1,
        },
        hasLoadedOldestEntry: {
          [accountId]: false,
          [account2Id]: false,
        },
      } as unknown as ActivitiesSliceState;

      it('should remove all the activities data for the account', () => {
        const newState = activitiesReducers.activities(
          state,
          walletsActions.wallets.removeAccount(walletId, accountId),
        );
        expect(newState.activities).toStrictEqual({
          [account2Id]: [activity2],
        });
        expect(newState.hasLoadedOldestEntry).toStrictEqual({
          [account2Id]: false,
        });
        expect(newState.desiredLoadedActivitiesCountPerAccount).toStrictEqual({
          [account2Id]: 1,
        });
      });
    });

    describe('removeWallet extraReducer', () => {
      const walletId = WalletId('wallet1');
      const state = {
        ...initialState,
        activities: {
          [accountId]: [activity1],
          [account2Id]: [activity2],
        },
        desiredLoadedActivitiesCountPerAccount: {
          [accountId]: 1,
          [account2Id]: 1,
        },
        hasLoadedOldestEntry: {
          [accountId]: false,
          [account2Id]: false,
        },
      } as unknown as ActivitiesSliceState;

      it('should remove activities for all accounts provided', () => {
        const newState = activitiesReducers.activities(
          state,
          walletsActions.wallets.removeWallet(walletId, [
            accountId,
            account2Id,
          ]),
        );
        expect(newState.activities).toStrictEqual({});
        expect(newState.hasLoadedOldestEntry).toStrictEqual({});
        expect(newState.desiredLoadedActivitiesCountPerAccount).toStrictEqual(
          {},
        );
      });
    });
  });

  describe('selectors', () => {
    describe('selectAllFlat', () => {
      it('returns flatten activities', () => {
        const state = {
          activities: {
            ...initialState,
            activities: {
              [accountId]: [activity1],
              [account2Id]: [activity2],
            },
          },
        };

        expect(
          activitiesSelectors.activities.selectAllFlat(state),
        ).toStrictEqual([activity1, activity2]);
      });
    });

    describe('selectByTokenIdFlat', () => {
      it('returns flatten activities for a given tokenId', () => {
        const state = {
          activities: {
            ...initialState,
            activities: {
              [accountId]: [activity1],
              [account2Id]: [activity2],
            },
          },
        };

        expect(
          activitiesSelectors.activities.selectByTokenIdFlat(state, {
            limit: 10,
            tokenId: TokenId('tDust'),
          }),
        ).toStrictEqual([activity1]);
      });

      it('returns flatten activities in maximum amount specified by limit property', () => {
        const state = {
          activities: {
            ...initialState,
            activities: {
              [accountId]: [activity1],
              [account2Id]: [activity1, activity2],
            },
          },
        };

        expect(
          activitiesSelectors.activities.selectByTokenIdFlat(state, {
            limit: 10,
            tokenId: TokenId('tDust'),
          }),
        ).toStrictEqual([activity1, activity1]);
        expect(
          activitiesSelectors.activities.selectByTokenIdFlat(state, {
            limit: 1,
            tokenId: TokenId('tDust'),
          }),
        ).toStrictEqual([activity1]);
      });
    });

    describe('selectByAccountId', () => {
      it('returns activities filtered by accountId', () => {
        const state = {
          activities: {
            ...initialState,
            activities: {
              [accountId]: [activity1],
              [account2Id]: [activity2],
            },
          },
        };

        expect(
          activitiesSelectors.activities.selectByAccountId(state, {
            accountId,
          }),
        ).toStrictEqual([activity1]);
      });

      it('returns empty array when no activities exist for the accountId', () => {
        const state = {
          activities: {
            ...initialState,
            activities: {
              [account2Id]: [activity2],
            },
          },
        };

        expect(
          activitiesSelectors.activities.selectByAccountId(state, {
            accountId,
          }),
        ).toStrictEqual([]);
      });

      it('returns multiple activities for the same accountId', () => {
        const activity3 = {
          accountId,
          activityId: 'activity3',
          timestamp: Timestamp(1746526784957),
          tokenBalanceChanges: [
            { tokenId: TokenId('tDust'), amount: BigNumber(0n) },
          ],
          type: ActivityType.Send,
        };

        const state = {
          activities: {
            ...initialState,
            activities: {
              [accountId]: [activity1, activity3],
              [account2Id]: [activity2],
            },
          },
        };

        expect(
          activitiesSelectors.activities.selectByAccountId(state, {
            accountId,
          }),
        ).toStrictEqual([activity1, activity3]);
      });
    });

    describe('selectActivityDetails', () => {
      const activityDetail: ActivityDetail = {
        ...activity1,
        address: 'addr_test1',
        fee: '0',
      };

      it('returns the deserialized activity details', () => {
        const state = {
          activities: {
            ...initialState,
            activityDetails: Serializable.to<ActivityDetail>(activityDetail),
          },
        };

        expect(
          activitiesSelectors.activities.selectActivityDetails(state),
        ).toStrictEqual(activityDetail);
      });

      it('returns undefined when no activity details are set', () => {
        const state = { activities: initialState };

        expect(
          activitiesSelectors.activities.selectActivityDetails(state),
        ).toBeUndefined();
      });

      it('returns the same reference across calls when the serialized payload is unchanged', () => {
        const state = {
          activities: {
            ...initialState,
            activityDetails: Serializable.to<ActivityDetail>(activityDetail),
          },
        };

        const first =
          activitiesSelectors.activities.selectActivityDetails(state);
        const second =
          activitiesSelectors.activities.selectActivityDetails(state);

        expect(second).toBe(first);
      });

      it('returns a new reference when the serialized payload changes', () => {
        const stateA = {
          activities: {
            ...initialState,
            activityDetails: Serializable.to<ActivityDetail>(activityDetail),
          },
        };
        const stateB = {
          activities: {
            ...initialState,
            activityDetails: Serializable.to<ActivityDetail>({
              ...activityDetail,
              fee: '1',
            }),
          },
        };

        const first =
          activitiesSelectors.activities.selectActivityDetails(stateA);
        const second =
          activitiesSelectors.activities.selectActivityDetails(stateB);

        expect(second).not.toBe(first);
        expect(second).toStrictEqual({ ...activityDetail, fee: '1' });
      });
    });
  });

  describe('selectHasLoadedOldestEntry', () => {
    it('returns loading state', () => {
      const state = {
        activities: {
          ...initialState,
          hasLoadedOldestEntry: {
            [accountId]: true,
          },
        },
      };
      expect(
        activitiesSelectors.activities.selectHasLoadedOldestEntry(state),
      ).toStrictEqual({ [accountId]: true });
    });
  });

  describe('selectHasLoadedOldestEntryByAccount', () => {
    it('returns loading state for a specific account', () => {
      const state = {
        activities: {
          ...initialState,
          hasLoadedOldestEntry: {
            [accountId]: true,
            [account2Id]: false,
          },
        },
      };
      expect(
        activitiesSelectors.activities.selectHasLoadedOldestEntryByAccount(
          state,
          accountId,
        ),
      ).toBe(true);
      expect(
        activitiesSelectors.activities.selectHasLoadedOldestEntryByAccount(
          state,
          account2Id,
        ),
      ).toBe(false);
    });
  });

  describe('selectIsLoadingOlderActivities', () => {
    it('returns loading state for a specific account', () => {
      const state = {
        activities: {
          ...initialState,
          activities: {
            [accountId]: [activity1, activity1, activity1],
            [account2Id]: [
              activity2,
              activity2,
              activity2,
              activity2,
              activity2,
            ],
          },
          desiredLoadedActivitiesCountPerAccount: {
            [accountId]: 4,
            [account2Id]: 5,
          },
        },
        failures: { byId: {} },
      };
      expect(
        activitiesSelectors.activities.selectIsLoadingOlderActivitiesByAccount(
          state,
          accountId,
        ),
      ).toBe(true);
      expect(
        activitiesSelectors.activities.selectIsLoadingOlderActivitiesByAccount(
          state,
          account2Id,
        ),
      ).toBe(false);
    });

    it('returns false when the oldest entry has been loaded even if desired count exceeds stored activities', () => {
      const state = {
        activities: {
          ...initialState,
          activities: {
            [accountId]: [activity1, activity1, activity1],
          },
          desiredLoadedActivitiesCountPerAccount: {
            [accountId]: 20,
          },
          hasLoadedOldestEntry: {
            [accountId]: true,
          },
        },
        failures: { byId: {} },
      };
      expect(
        activitiesSelectors.activities.selectIsLoadingOlderActivitiesByAccount(
          state,
          accountId,
        ),
      ).toBe(false);
    });

    it('returns false when a pagination failure exists for the account even if desired count exceeds stored activities', () => {
      const failureId = ActivitiesPaginationFailureId(accountId);
      const failure: Failure = {
        failureId,
        message: 'sync.error.midnight-wallet-start-failed',
      };
      const state = {
        activities: {
          ...initialState,
          activities: {
            [accountId]: [activity1],
          },
          desiredLoadedActivitiesCountPerAccount: {
            [accountId]: 10,
          },
        },
        failures: {
          byId: { [failureId]: failure },
        },
      };
      expect(
        activitiesSelectors.activities.selectIsLoadingOlderActivitiesByAccount(
          state,
          accountId,
        ),
      ).toBe(false);
    });

    it('returns true when no pagination failure exists for the account and desired count exceeds stored activities', () => {
      const otherFailureId = ActivitiesPaginationFailureId(account2Id);
      const failure: Failure = {
        failureId: otherFailureId,
        message: 'sync.error.midnight-wallet-start-failed',
      };
      const state = {
        activities: {
          ...initialState,
          activities: {
            [accountId]: [activity1],
          },
          desiredLoadedActivitiesCountPerAccount: {
            [accountId]: 10,
          },
        },
        failures: {
          byId: { [otherFailureId]: failure },
        },
      };
      expect(
        activitiesSelectors.activities.selectIsLoadingOlderActivitiesByAccount(
          state,
          accountId,
        ),
      ).toBe(true);
    });
  });

  describe('selectPendingActivitiesByAccount', () => {
    const pendingActivity = (id: string, acct: AccountId) => ({
      accountId: acct,
      activityId: id,
      timestamp: Timestamp(1_000_000_000),
      tokenBalanceChanges: [],
      type: ActivityType.Pending,
    });

    const confirmedActivity = (id: string, acct: AccountId) => ({
      accountId: acct,
      activityId: id,
      timestamp: Timestamp(1_000_000_000),
      tokenBalanceChanges: [],
      type: ActivityType.Send,
    });

    const wrapState = (activities: ActivitiesSliceState['activities']) => ({
      activities: {
        ...initialState,
        activities,
      },
    });

    it('returns only pending activities grouped by account', () => {
      const state = wrapState({
        [accountId]: [
          pendingActivity('tx1', accountId),
          confirmedActivity('tx2', accountId),
          pendingActivity('tx3', accountId),
        ],
        [account2Id]: [confirmedActivity('tx4', account2Id)],
      });

      expect(
        activitiesSelectors.activities.selectPendingActivitiesByAccount(state),
      ).toEqual({
        [accountId]: [
          pendingActivity('tx1', accountId),
          pendingActivity('tx3', accountId),
        ],
      });
    });

    it('omits accounts with no pending activities', () => {
      const state = wrapState({
        [accountId]: [confirmedActivity('tx1', accountId)],
      });

      expect(
        activitiesSelectors.activities.selectPendingActivitiesByAccount(state),
      ).toEqual({});
    });

    it('memoizes output when the slice reference is unchanged', () => {
      const state = wrapState({
        [accountId]: [pendingActivity('tx1', accountId)],
      });

      const first =
        activitiesSelectors.activities.selectPendingActivitiesByAccount(state);
      const second =
        activitiesSelectors.activities.selectPendingActivitiesByAccount(state);
      expect(first).toBe(second);
    });
  });
});
