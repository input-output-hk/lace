import { ActivityType } from '../../const';

import type { ActivitiesSliceState } from '../slice';
import type { PersistedState } from '@lace-contract/module';
import type { PersistedState as ReduxPersistedState } from 'redux-persist';

/**
 * Migration v2 → v3: reward spendable dates could be computed with the wrong
 * network's era summaries and then frozen (write-once), leaving some dated far
 * in the future. Drop persisted reward activities so they are re-derived from
 * the retained reward history with the fixed, cache-free calculation;
 * transactions are untouched.
 *
 * Dropping them shrinks the persisted count that REHYDRATE adopts as the window
 * size, which would hide the rewards until the user paginates. So also carry
 * each account's pre-deletion count through the rehydrate payload as a hint
 * (not whitelisted → read once here, never persisted) that REHYDRATE uses to
 * keep the window intact — do not reduce the return to just the pruned state.
 */
export const resetRewardActivities = (state: ReduxPersistedState) => {
  const typedState = state as PersistedState<ActivitiesSliceState>;
  const activitiesMap = typedState.activities ?? {};

  const desiredLoadedActivitiesCountPerAccount: Record<string, number> = {};

  for (const accountId of Object.keys(activitiesMap)) {
    const key = accountId as keyof typeof activitiesMap;
    const list = activitiesMap[key];
    if (!Array.isArray(list)) continue;
    desiredLoadedActivitiesCountPerAccount[accountId] = list.length;
    activitiesMap[key] = list.filter(
      activity => activity.type !== ActivityType.Rewards,
    );
  }

  return { ...typedState, desiredLoadedActivitiesCountPerAccount };
};
