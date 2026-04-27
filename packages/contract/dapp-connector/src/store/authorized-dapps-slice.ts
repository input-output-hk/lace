import { createSlice } from '@reduxjs/toolkit';

import { authorizeDappJobs } from './authorize-job-slices';

import type { AuthorizedDapp, Dapp } from '../';
import type { BlockchainName, ByBlockchainName } from '@lace-lib/util-store';
import type { PayloadAction } from '@reduxjs/toolkit';

export type AuthorizedDappsDataSlice = ByBlockchainName<AuthorizedDapp[]>;

export type RemoveAuthorizedDappPayload = {
  dapp: Pick<Dapp, 'id'>;
  blockchainName: BlockchainName;
};

const initialState: AuthorizedDappsDataSlice = {};

export const authorizedDappsSlice = createSlice({
  name: 'authorizedDapps',
  initialState,
  reducers: {
    removeAuthorizedDapp: (
      state,
      {
        payload: {
          blockchainName,
          dapp: { id },
        },
      }: PayloadAction<RemoveAuthorizedDappPayload>,
    ) => {
      state[blockchainName] = state[blockchainName]?.filter(
        ({ dapp }) => dapp.id !== id,
      );
    },
  },
  selectors: {
    selectAuthorizedDapps: state => state,
  },
  extraReducers: builder => {
    builder
      // Add authorized dapp to store
      .addCase(
        authorizeDappJobs.actions.completed,
        (state, { payload: authorizedDapp }) => {
          // Deduplicate by dapp id to prevent accumulation across sessions
          if (!authorizedDapp.authorized) return;
          state[authorizedDapp.blockchainName] = [
            ...(state[authorizedDapp.blockchainName] || []).filter(
              ({ dapp }) => dapp.id !== authorizedDapp.dapp.id,
            ),
            {
              blockchain: authorizedDapp.blockchainName,
              dapp: authorizedDapp.dapp,
              isPersisted: authorizedDapp.authorized,
            },
          ];
        },
      );
  },
});
