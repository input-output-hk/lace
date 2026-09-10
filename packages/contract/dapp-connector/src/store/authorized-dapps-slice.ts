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
    /**
     * Hydration: replace the whole slice with an externally-sourced snapshot
     * (e.g. the host grant table a host-pull module pulls). Wholesale on
     * purpose — the source is authoritative, so entries absent from the
     * snapshot are dropped. Hydrated entries carry `isPersisted: true` (they
     * exist in the source's persisted table).
     */
    setAuthorizedDapps: (
      _state,
      { payload }: PayloadAction<AuthorizedDappsDataSlice>,
    ) => payload,
    /**
     * Signal that the Authorized DApps view was opened. Holds no state of its
     * own — a hydration source (a host-pull bridge) re-pulls its authoritative
     * table on this trigger, so the view reflects grants added since boot
     * rather than a stale snapshot. See ADR 41: the host emits no grant-change
     * event, so the view-open is the pull cadence.
     */
    authorizedDappsViewed: state => state,
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
