import { markParameterizedSelector } from '@lace-contract/module';
import { AccountId, walletsActions } from '@lace-contract/wallet-repo';
import { Serializable } from '@lace-lib/util-store';
import { createAction, createSelector, createSlice } from '@reduxjs/toolkit';
import flatten from 'lodash/flatten';
import values from 'lodash/values';
import { REHYDRATE } from 'redux-persist';

import { ACTIVITIES_PER_PAGE, MAX_ACTIVITIES_PER_ACCOUNT } from '../const';

import type { Activity, ActivityDetail } from '../types';
import type { ProviderFailure } from '@cardano-sdk/core';
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

const initialState: ActivitiesSliceState = {
  activities: {},
  desiredLoadedActivitiesCountPerAccount: {},
  hasLoadedOldestEntry: {},
};

const slice = createSlice({
  name: 'activities',
  initialState,
  reducers: {
    setActivities: (
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
    upsertActivities: (
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
    selectActivityDetails: ({ activityDetails }) =>
      activityDetails
        ? Serializable.from<ActivityDetail>(activityDetails)
        : undefined,
  },
});

const selectAllFlat = createSelector(slice.selectors.selectAllMap, activities =>
  flatten(values(activities)),
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
      (_: unknown, accountId: AccountId) => accountId,
    ],
    (
      desiredLoadedActivitiesCountPerAccount,
      activities,
      hasLoadedOldestEntry,
      accountId,
      // eslint-disable-next-line max-params
    ) => {
      if (hasLoadedOldestEntry[accountId] ?? false) {
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

const loadActivityDetails = createAction<
  BlockchainAssigned<{
    activity: Activity;
  }>
>('activities/loadActivityDetails');

const getActivitiesFailed = createAction<{
  accountId: AccountId;
  failure: ProviderFailure;
}>('activities/getActivitiesFailed');

export const activitiesActions = {
  activities: {
    ...slice.actions,
    getActivitiesFailed,
    loadActivityDetails,
  },
};

export const activitiesReducers = {
  [slice.name]: slice.reducer,
};

export const activitiesSelectors = {
  activities: {
    ...slice.selectors,
    selectAllFlat,
    selectByAccountId,
    selectByAccountIdAndTokenId,
    selectByTokenIdFlat,
    selectActivityById,
    selectIsLoadingOlderActivitiesByAccount,
    selectHasLoadedOldestEntryByAccount,
  },
};

export type ActivitiesStoreState = StateFromReducersMapObject<
  typeof activitiesReducers
>;
