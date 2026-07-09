import type { DappExplorerState } from '../slice';
import type { PersistedState } from '@lace-contract/module';
import type { PersistedState as ReduxPersistedState } from 'redux-persist';

export const addUkFcaDisclaimerAcknowledged = (state: ReduxPersistedState) => {
  const typedState = state as PersistedState<DappExplorerState>;
  typedState.ukFcaDisclaimerAcknowledged =
    typedState.ukFcaDisclaimerAcknowledged ?? false;
  return typedState;
};
