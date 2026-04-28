import type { CardanoContextSliceState } from '../slice';
import type { PersistedState } from '@lace-contract/module';
import type { PersistedState as ReduxPersistedState } from 'redux-persist';

/**
 * Use this whenver RequiredProtocolParameters type changes
 */
export const deleteProtocolParameters = (state: ReduxPersistedState) => {
  const typedState = state as PersistedState<CardanoContextSliceState>;
  for (const networkInfo of Object.values(typedState.networkInfo)) {
    delete networkInfo?.protocolParameters;
  }
  return typedState;
};
