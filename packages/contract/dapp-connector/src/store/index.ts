import { inferStoreContext } from '@lace-contract/module';
import { createSelector } from '@reduxjs/toolkit';

import { authorizeDappJobs } from './authorize-job-slices';
import { authorizedDappsSlice } from './authorized-dapps-slice';
import { connectedDappsSlice } from './connected-dapps-slice';

import type { State } from '@lace-contract/module';

export type * from './authorized-dapps-slice';
export type * from './connected-dapps-slice';
export type * from './authorize-job-slices';
export type { DappConnectorStoreState } from './init';

export const dappConnectorActions = {
  authorizeDapp: {
    ...authorizeDappJobs.actions,
  },
  authorizedDapps: authorizedDappsSlice.actions,
  connectedDapps: connectedDappsSlice.actions,
};

const selectAuthorizeDappJobs = (s: Pick<State, 'authorizeDapp'>) =>
  authorizeDappJobs.selectors.jobs(s);

export const dappConnectorSelectors = {
  dappConnector: {
    ...authorizedDappsSlice.selectors,
    ...connectedDappsSlice.selectors,
    selectAuthorizeDappJobs,
    selectActiveAuthorizeDappRequest: createSelector(
      selectAuthorizeDappJobs,
      jobs =>
        Object.values(jobs).find(job => !job?.result && !job?.error)?.payload,
    ),
  },
};

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: dappConnectorActions,
    selectors: dappConnectorSelectors,
  },
});
