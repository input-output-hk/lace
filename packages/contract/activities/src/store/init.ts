import {
  isReduxPersistState,
  type LaceInit,
  type LaceModuleStoreInit,
  type PersistedStateProperty,
} from '@lace-contract/module';
import { AccountId } from '@lace-contract/wallet-repo';
import { createMigrate, createTransform } from 'redux-persist';

import { MAX_ACTIVITIES_PER_ACCOUNT } from '../const';

import { rewardEpochDisplay } from './migrations/reward-epoch-display';
import { activitiesReducers, type ActivitiesSliceState } from './slice';

export const activitiesTransform = createTransform<
  PersistedStateProperty<ActivitiesSliceState>,
  PersistedStateProperty<ActivitiesSliceState>
>((inboundState, key) => {
  if (isReduxPersistState(key, inboundState)) {
    return inboundState;
  }

  const outboundState: ActivitiesSliceState['activities'] = {};

  if (key === 'activities') {
    const inboundActivities =
      inboundState as ActivitiesSliceState['activities'];

    for (const accountId in inboundActivities) {
      // assume that the activities are sorted by timestamp in descending order
      outboundState[AccountId(accountId)] = [
        ...(inboundActivities[AccountId(accountId)] ?? []),
      ].slice(0, MAX_ACTIVITIES_PER_ACCOUNT);
    }
  }

  return outboundState;
});

const store: LaceInit<LaceModuleStoreInit> = () => ({
  reducers: activitiesReducers,
  persistConfig: {
    activities: {
      version: 2,
      whitelist: ['activities'],
      migrate: createMigrate({
        2: rewardEpochDisplay,
      }),
      transforms: [activitiesTransform],
    },
  },
});

export default store;
