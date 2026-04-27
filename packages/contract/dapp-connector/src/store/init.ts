import { isReduxPersistState } from '@lace-contract/module';
import { createTransform } from 'redux-persist';

import { authorizeDappJobs } from './authorize-job-slices';
import { authorizedDappsSlice } from './authorized-dapps-slice';
import { connectedDappsSlice } from './connected-dapps-slice';
import { initializeDappConnectorSideEffects } from './side-effects';

import type { AuthorizedDappsDataSlice } from './authorized-dapps-slice';
import type {
  LaceInit,
  LaceModuleStoreInit,
  PersistedStateProperty,
} from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

export const dappConnectorReducers = {
  [authorizeDappJobs.reducerPath]: authorizeDappJobs.reducer,
  [authorizedDappsSlice.reducerPath]: authorizedDappsSlice.reducer,
  [connectedDappsSlice.reducerPath]: connectedDappsSlice.reducer,
};

const FilterPersistedDappsTransform = createTransform<
  PersistedStateProperty<AuthorizedDappsDataSlice>,
  PersistedStateProperty<AuthorizedDappsDataSlice>
>(
  // transform state on its way to being serialized and persisted.
  (inboundState, key) => {
    if (isReduxPersistState(key, inboundState)) {
      return inboundState;
    }
    return inboundState?.filter(dapp => dapp.isPersisted);
  },
);

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  reducers: dappConnectorReducers,
  sideEffects: await initializeDappConnectorSideEffects(props, dependencies),
  persistConfig: {
    [authorizedDappsSlice.reducerPath]: {
      version: 1,
      transforms: [FilterPersistedDappsTransform],
    },
  },
});

export default store;

export type DappConnectorStoreState = StateFromReducersMapObject<
  typeof dappConnectorReducers
>;
