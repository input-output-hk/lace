import type { CardanoContextSliceState } from '../slice';
import type { PersistedState } from '@lace-contract/module';
import type { PersistedState as ReduxPersistedState } from 'redux-persist';

export const deleteStakePoolsSystem = (state: ReduxPersistedState) => {
  const typedState = state as PersistedState<CardanoContextSliceState>;

  for (const networkInfo of Object.values(typedState.networkInfo)) {
    if (networkInfo) {
      const object = networkInfo as Record<string, unknown>;

      delete object.stakePoolsData;
      delete object.stakePoolsStats;
      delete object.stakePoolsResults;
    }
  }

  return typedState;
};
