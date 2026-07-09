import { failuresSelectors } from '@lace-contract/failures';
import { markParameterizedSelector } from '@lace-contract/module';
import { AccountId, walletsActions } from '@lace-contract/wallet-repo';
import { Serializable } from '@lace-lib/util-store';
import { createAction, createSelector, createSlice } from '@reduxjs/toolkit';
import flatten from 'lodash/flatten';
import values from 'lodash/values';
import { REHYDRATE } from 'redux-persist';

import {
  ACTIVITIES_PER_PAGE,
  ActivityType,
  MAX_ACTIVITIES_PER_ACCOUNT,
} from '../const';
import { ActivitiesPaginationFailureId } from '../value-objects';

import type { Activity, ActivityDetail } from '../types';
import type { TokenId } from '@lace-contract/tokens';
import type { BlockchainAssigned } from '@lace-lib/util-store';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';
import type { RehydrateAction } from 'redux-persist';

const sortActivitiesCallback = (a: Activity, b: Activity) =>
  b.timestamp - a.timestamp;

export type ActivitiesSliceState<BlockchainSpecificMetadata = unknown> = {
  activities: Record<AccountId, Activity<BlockchainSpecificMetadata>[]>;
  desiredLoadedActivitiesCountPerAccount: Record<AccountId, number>;
  hasLoadedOldestEntry: Record<AccountId, boolean>;
  activityDetails?: Serializable<ActivityDetail<BlockchainSpecificMetadata>>;
};

export type PendingActivitiesByAccount<BlockchainSpecificMetadata = unknown> =
  Record<AccountId, Activity<BlockchainSpecificMetadata>[]>;

const EMPTY_PENDING_ACTIVITIES_BY_ACCOUNT: PendingActivitiesByAccount = {};

const initialState: ActivitiesSliceState = {
  activities: {},
  desiredLoadedActivitiesCountPerAccount: {},
  hasLoadedOldestEntry: {},
};

const encodeActivity = (activity: Activity): Activity => {
  if (activity.blockchainSpecific === undefined) return activity;
  return {
    ...activity,
    blockchainSpecific: Serializable.to(
      activity.blockchainSpecific as object,
    ) as unknown,
  };
};

const decodeActivity = (activity: Activity): Activity => {
  if (activity.blockchainSpecific === undefined) return activity;
  return {
    ...activity,
    blockchainSpecific: Serializable.fromCached(
      activity.blockchainSpecific as unknown as Serializable<unknown>,
    ),
  };
};

const slice = createSlice({
  name: 'activities',
  initialState,
  reducers: {
    setActivities: {
      reducer: (
        state,
        {
          payload: { accountId, activities },
        }: Readonly<
          PayloadAction<{ accountId: AccountId; activities: Activity[] }>
        >,
      ) => {
        state.activities[accountId] = [...activities].sort(
          sortActivitiesCallback,
        );
      },
      prepare: ({
        accountId,
        activities,
      }: {
        accountId: AccountId;
        activities: Activity[];
      }) => ({
        payload: { accountId, activities: activities.map(encodeActivity) },
      }),
    },
    setActivityDetails: {
      reducer: (
        state,
        action: PayloadAction<{
          activityDetails?: Serializable<ActivityDetail>;
        }>,
      ) => {
        state.activityDetails = action.payload.activityDetails;
      },
      prepare: ({
        activityDetails,
      }: {
        activityDetails: ActivityDetail | undefined;
      }) => {
        const serialized = activityDetails
          ? Serializable.to<ActivityDetail>(activityDetails)
          : undefined;
        return { payload: { activityDetails: serialized } };
      },
    },
    upsertActivities: {
      reducer: (
        state,
        {
          payload: { accountId, activities: incomingActivities },
        }: Readonly<
          PayloadAction<{
            accountId: AccountId;
            activities: Activity[];
          }>
        >,
      ) => {
        const currentActivities = state.activities[accountId] || [];
        const jointActivityEntries = [
          ...currentActivities,
          ...incomingActivities,
        ].map(activity => [activity.activityId, activity] as const);
        state.activities[accountId] = [
          ...new Map(jointActivityEntries).values(),
        ].sort(sortActivitiesCallback);
      },
      prepare: ({
        accountId,
        activities,
      }: {
        accountId: AccountId;
        activities: Activity[];
      }) => ({
        payload: { accountId, activities: activities.map(encodeActivity) },
      }),
    },
    resetActivities: (
      state,
      {
        payload: { accountId },
      }: Readonly<PayloadAction<{ accountId: AccountId }>>,
    ) => {
      delete state.activities[accountId];
    },
    clearActivities: () => {
      return initialState;
    },
    incrementDesiredLoadedActivitiesCount: (
      state,
      {
        payload: { accountId, incrementBy = ACTIVITIES_PER_PAGE },
      }: Readonly<
        PayloadAction<{ accountId: AccountId; incrementBy?: number }>
      >,
    ) => {
      const currentDesiredCount =
        state.desiredLoadedActivitiesCountPerAccount[accountId] ?? 0;
      const loadedActivitiesForAccount =
        state.activities[accountId]?.length ?? 0;

      if (currentDesiredCount <= loadedActivitiesForAccount) {
        // Anchor on the actual loaded count so the first increment always
        // lifts desired above loaded and triggers a fetch. Without this,
        // when side effects (e.g. newer-tx polling) populate activities
        // before anyone has incremented desired, the first increment just
        // catches desired up to loaded and no fetch fires.
        state.desiredLoadedActivitiesCountPerAccount[accountId] =
          loadedActivitiesForAccount + incrementBy;
      }
    },
    setHasLoadedOldestEntry: (
      state,
      {
        payload: { accountId, hasLoadedOldestEntry },
      }: Readonly<
        PayloadAction<{ accountId: AccountId; hasLoadedOldestEntry: boolean }>
      >,
    ) => {
      state.hasLoadedOldestEntry[accountId] = hasLoadedOldestEntry;
    },
    setDesiredLoadedActivitiesCount: (
      state,
      {
        payload: { accountId, desiredLoadedActivitiesCount },
      }: Readonly<
        PayloadAction<{
          accountId: AccountId;
          desiredLoadedActivitiesCount: number;
        }>
      >,
    ) => {
      state.desiredLoadedActivitiesCountPerAccount[accountId] =
        desiredLoadedActivitiesCount;
    },
  },
  extraReducers: builder => {
    /**
     * Handles the REHYDRATE action to restore the activities state from persisted storage.
     * For each account, sets the initial desiredLoadedActivitiesCountPerAccount to the number of activities
     * that were persisted for that account.
     *
     * @param state - The current state of the activities slice.
     * @param action - The rehydrate action containing the payload with activities data.
     */
    builder.addCase(REHYDRATE, (state, action: RehydrateAction) => {
      const isRehydrateAction = 'key' in action && action.key === 'activities';
      if (!isRehydrateAction || !action.payload) return;
      const { activities } = action.payload as {
        activities?: Record<AccountId, Activity[]>;
      };

      Object.entries(activities ?? {}).forEach(
        ([accountId, accountActivities]) => {
          const id = AccountId(accountId);
          state.desiredLoadedActivitiesCountPerAccount[id] =
            accountActivities.length;
          if (accountActivities.length >= MAX_ACTIVITIES_PER_ACCOUNT) {
            state.hasLoadedOldestEntry[id] = false;
          }
        },
      );
    });
    /**
     * Handles the removeAccount action to remove the activities data for the account.
     * @param state - The current state of the activities slice.
     * @param action - The removeAccount action containing the payload with accountId.
     */
    builder.addCase(walletsActions.wallets.removeAccount, (state, action) => {
      const { accountId } = action.payload;
      delete state.activities[accountId];
      delete state.desiredLoadedActivitiesCountPerAccount[accountId];
      delete state.hasLoadedOldestEntry[accountId];
    });

    /**
     * Handles the removeWallet action to remove activities for all accounts of the wallet.
     * @param state - The current state of the activities slice.
     * @param action - The removeWallet action containing the walletId and accountIds.
     */
    builder.addCase(walletsActions.wallets.removeWallet, (state, action) => {
      const { accountIds } = action.payload;
      for (const accountId of accountIds) {
        delete state.activities[accountId];
        delete state.desiredLoadedActivitiesCountPerAccount[accountId];
        delete state.hasLoadedOldestEntry[accountId];
      }
    });
  },
  selectors: {
    selectAllMap: state => state.activities,
    selectHasLoadedOldestEntry: state => state.hasLoadedOldestEntry,
    selectDesiredLoadedActivitiesCountPerAccount: state =>
      state.desiredLoadedActivitiesCountPerAccount,
    selectActivityDetails: state => state.activityDetails,
  },
});

const selectActivityDetails = createSelector(
  slice.selectors.selectActivityDetails,
  activityDetails =>
    activityDetails
      ? Serializable.from<ActivityDetail>(activityDetails)
      : undefined,
);

const selectAllMap = createSelector(
  slice.selectors.selectAllMap,
  rawActivities => {
    const decoded: Record<AccountId, Activity[]> = {};
    for (const accountId in rawActivities) {
      decoded[accountId as AccountId] = (
        rawActivities[accountId as AccountId] ?? []
      ).map(decodeActivity);
    }
    return decoded;
  },
);

const selectAllFlat = createSelector(selectAllMap, activities =>
  flatten(values(activities)),
);

const selectPendingActivitiesByAccount = createSelector(
  selectAllMap,
  (activitiesByAccount): PendingActivitiesByAccount => {
    const result: PendingActivitiesByAccount = {};
    let hasAny = false;
    for (const accountId in activitiesByAccount) {
      const pending = activitiesByAccount[accountId as AccountId].filter(
        activity => activity.type === ActivityType.Pending,
      );
      if (pending.length > 0) {
        result[accountId as AccountId] = pending;
        hasAny = true;
      }
    }
    return hasAny ? result : EMPTY_PENDING_ACTIVITIES_BY_ACCOUNT;
  },
);

const selectByAccountId = markParameterizedSelector(
  createSelector(
    selectAllFlat,
    (_: unknown, params: { accountId: AccountId }) => params,
    (activities, { accountId }) =>
      activities.filter(a => a.accountId === accountId),
  ),
);

const selectByTokenIdFlat = createSelector(
  selectAllFlat,
  (_: unknown, params: { limit: number; tokenId: TokenId }) => params,
  (activities, { limit, tokenId }) =>
    activities
      .filter(a => a.tokenBalanceChanges.some(c => c.tokenId === tokenId))
      .slice(0, limit),
);

const selectByAccountIdAndTokenId = markParameterizedSelector(
  createSelector(
    selectAllFlat,
    (_: unknown, params: { accountId: AccountId; tokenId: TokenId }) => params,
    (activities, { accountId, tokenId }) =>
      activities.filter(
        account =>
          account.accountId === accountId &&
          account.tokenBalanceChanges.some(token => token.tokenId === tokenId),
      ),
  ),
);

const selectActivityById = markParameterizedSelector(
  createSelector(
    selectAllFlat,
    (_: unknown, activityId: string) => activityId,
    (activities, activityId) =>
      activities.find(activity => activity.activityId === activityId),
  ),
);

const selectIsLoadingOlderActivitiesByAccount = markParameterizedSelector(
  createSelector(
    [
      slice.selectors.selectDesiredLoadedActivitiesCountPerAccount,
      slice.selectors.selectAllMap,
      slice.selectors.selectHasLoadedOldestEntry,
      failuresSelectors.failures.selectAllFailures,
      (_: unknown, accountId: AccountId) => accountId,
    ],
    (
      desiredLoadedActivitiesCountPerAccount,
      activities,
      hasLoadedOldestEntry,
      failures,
      accountId,
      // eslint-disable-next-line max-params
    ) => {
      if (hasLoadedOldestEntry[accountId] ?? false) {
        return false;
      }
      if (failures[ActivitiesPaginationFailureId(accountId)]) {
        return false;
      }
      const desiredLoadedActivitiesCount =
        desiredLoadedActivitiesCountPerAccount[accountId] ?? 0;
      const activitiesCount = activities[accountId]?.length ?? 0;
      return desiredLoadedActivitiesCount > activitiesCount;
    },
  ),
);

const selectHasLoadedOldestEntryByAccount = markParameterizedSelector(
  createSelector(
    slice.selectors.selectHasLoadedOldestEntry,
    (_: unknown, accountId: AccountId) => accountId,
    (hasLoadedOldestEntry, accountId) =>
      hasLoadedOldestEntry[accountId] ?? false,
  ),
);

const retryPagination = createAction<{ accountId: AccountId }>(
  'activities/retryPagination',
);

const loadActivityDetails = createAction<
  BlockchainAssigned<{
    activity: Activity;
  }>
>('activities/loadActivityDetails');

export const activitiesActions = {
  activities: {
    ...slice.actions,
    loadActivityDetails,
    retryPagination,
  },
};

export const activitiesReducers = {
  [slice.name]: slice.reducer,
};

export const activitiesSelectors = {
  activities: {
    ...slice.selectors,
    selectAllMap,
    selectAllFlat,
    selectByAccountId,
    selectByAccountIdAndTokenId,
    selectByTokenIdFlat,
    selectActivityById,
    selectActivityDetails,
    selectIsLoadingOlderActivitiesByAccount,
    selectHasLoadedOldestEntryByAccount,
    selectPendingActivitiesByAccount,
  },
};

export type ActivitiesStoreState = StateFromReducersMapObject<
  typeof activitiesReducers
>;
