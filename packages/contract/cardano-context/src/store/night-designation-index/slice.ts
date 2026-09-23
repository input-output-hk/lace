import { createSlice } from '@reduxjs/toolkit';

import type {
  NightDesignationIndexSliceState,
  NightDesignationSnapshot,
} from './types';
import type { AccountId } from '@lace-contract/wallet-repo';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

export type { NightDesignationIndexSliceState };

const initialState: NightDesignationIndexSliceState = { byAccount: {} };

export const slice = createSlice({
  name: 'nightDesignationIndex',
  initialState,
  reducers: {
    refreshRequested: (
      state,
      { payload }: PayloadAction<{ accountId: AccountId }>,
    ) => {
      const entry = state.byAccount[payload.accountId];
      // The previous snapshot is kept so a surface already showing the
      // designation doesn't blank out while the re-read is in flight.
      state.byAccount[payload.accountId] = {
        ...entry,
        refreshing: true,
        failed: false,
      };
    },
    refreshCompleted: (
      state,
      {
        payload,
      }: PayloadAction<{
        accountId: AccountId;
        snapshot: NightDesignationSnapshot;
      }>,
    ) => {
      const entry = state.byAccount[payload.accountId];
      // A settling entry stays settling: this read scanned a script address
      // that cannot yet see the submitted transaction, so letting it clear
      // the flag would hand the surface a pre-transaction answer as a
      // settled one — the "not designated" that invites a second designate.
      state.byAccount[payload.accountId] = {
        ...(entry?.settling === undefined ? {} : { settling: entry.settling }),
        snapshot: payload.snapshot,
        refreshing: false,
        failed: false,
      };
    },
    refreshFailed: (
      state,
      { payload }: PayloadAction<{ accountId: AccountId }>,
    ) => {
      const entry = state.byAccount[payload.accountId];
      state.byAccount[payload.accountId] = {
        ...entry,
        refreshing: false,
        failed: true,
      };
    },
    settlingStarted: (
      state,
      { payload }: PayloadAction<{ accountId: AccountId; txId: string }>,
    ) => {
      const entry = state.byAccount[payload.accountId];
      state.byAccount[payload.accountId] = {
        refreshing: false,
        failed: false,
        ...entry,
        settling: { txId: payload.txId },
      };
    },
    settlingEnded: (
      state,
      { payload }: PayloadAction<{ accountId: AccountId }>,
    ) => {
      const entry = state.byAccount[payload.accountId];
      if (entry === undefined) return;
      delete entry.settling;
    },
  },
  selectors: {
    selectIndexByAccount: (state: NightDesignationIndexSliceState) =>
      state.byAccount,
  },
});

export const nightDesignationIndexReducers = {
  [slice.name]: slice.reducer,
};

export const nightDesignationIndexActions = {
  nightDesignationIndex: slice.actions,
};

export const nightDesignationIndexSelectors = {
  nightDesignationIndex: slice.selectors,
};

export type NightDesignationIndexStoreState = StateFromReducersMapObject<
  typeof nightDesignationIndexReducers
>;
