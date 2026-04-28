import type { CardanoContextSliceState } from '../slice';
import type { PersistedState } from '@lace-contract/module';
import type { PersistedState as ReduxPersistedState } from 'redux-persist';

export const deleteStakePoolsData = (state: ReduxPersistedState) => {
  const typedState = state as PersistedState<CardanoContextSliceState>;
  if (!typedState.networkInfo) {
    typedState.networkInfo = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    delete (typedState as any).stakePoolsData;
  }
  return typedState;
};
