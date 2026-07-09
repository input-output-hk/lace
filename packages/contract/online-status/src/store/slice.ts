import { createSlice } from '@reduxjs/toolkit';

import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';
import type * as _immer from 'immer';

export type OnlineStatusSliceState = {
  isOffline: boolean;
};

const initialState: OnlineStatusSliceState = {
  isOffline: false,
};

const slice = createSlice({
  name: 'onlineStatus',
  initialState,
  reducers: {
    setOffline: (state, { payload }: Readonly<PayloadAction<boolean>>) => {
      state.isOffline = payload;
    },
  },
  selectors: {
    selectIsOffline: ({ isOffline }) => isOffline,
  },
});

export const onlineStatusReducers = {
  [slice.name]: slice.reducer,
};

export const onlineStatusActions = {
  onlineStatus: slice.actions,
};

export const onlineStatusSelectors = {
  onlineStatus: slice.selectors,
};

export type OnlineStatusStoreState = StateFromReducersMapObject<
  typeof onlineStatusReducers
>;
