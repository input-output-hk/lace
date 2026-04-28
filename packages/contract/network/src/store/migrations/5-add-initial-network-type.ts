import type { NetworkSliceState } from '../slice';
import type { PersistedState } from '@lace-contract/module';
import type { PersistedState as ReduxPersistedState } from 'redux-persist';

export const addInitialNetworkType = (state: ReduxPersistedState) => {
  const typedState = state as PersistedState<NetworkSliceState>;
  // Seed initialNetworkType from the persisted networkType so that existing
  // users who already changed their network type are not considered "diverged"
  // from the flag on first upgrade — their networkType becomes the new baseline.
  typedState.initialNetworkType =
    typedState.initialNetworkType ?? typedState.networkType ?? 'mainnet';
  return typedState;
};
