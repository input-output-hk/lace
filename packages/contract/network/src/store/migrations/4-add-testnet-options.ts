import type { NetworkSliceState } from '../slice';
import type { PersistedState } from '@lace-contract/module';
import type { PersistedState as ReduxPersistedState } from 'redux-persist';

export const addTestnetOptions = (state: ReduxPersistedState) => {
  const typedState = state as PersistedState<NetworkSliceState>;
  typedState.testnetOptions = typedState.testnetOptions ?? {};
  return typedState;
};
