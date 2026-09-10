import { createSlice } from '@reduxjs/toolkit';

// The guest wallet-repo is a read-through projection of the host vault (pull
// model, ADR 34 — no push events). This slice carries no state; it exists only
// to expose a trigger the hydrator re-syncs on (a create/import ceremony
// request dispatches it in a later commit).
const slice = createSlice({
  name: 'cardanoHostPull',
  initialState: {} as Record<string, never>,
  reducers: {
    syncWalletsRequested: () => {},
  },
});

export const cardanoHostPullReducers = {
  [slice.name]: slice.reducer,
};

export const cardanoHostPullActions = {
  [slice.name]: slice.actions,
};

export const cardanoHostPullSelectors = {
  [slice.name]: slice.selectors,
};

/** The hydration trigger the guest dispatches after a create/import ceremony
 * request so the wallet-repo projection re-syncs (pull model, ADR 34). */
export const { syncWalletsRequested } = slice.actions;
