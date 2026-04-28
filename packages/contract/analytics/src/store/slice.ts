import { createAction, createSlice } from '@reduxjs/toolkit';

import type { AnalyticsEvent } from '../types';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

export type AnalyticsUser = {
  id: string;
};

export type AnalyticsSliceState = {
  analytics: {
    user?: AnalyticsUser;
  };
};

const initialState: AnalyticsSliceState = { analytics: {} };

const slice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    load: (state, { payload }: PayloadAction<AnalyticsUser>) => {
      state.analytics.user = payload;
    },
  },
  selectors: {
    selectAnalyticsUser: (state: Readonly<AnalyticsSliceState>) =>
      state.analytics.user,
  },
});

export const analyticsReducers = {
  [slice.name]: slice.reducer,
};

const trackEvent = createAction(
  'analytics/trackEvent',
  (payload: AnalyticsEvent) => ({
    payload,
  }),
);

/** Direct import of this is an anti-pattern. OK for tests. */
export const analyticsActions = {
  analytics: {
    ...slice.actions,
    trackEvent,
  },
};

/** Direct import of this is an anti-pattern. OK for tests. */
export const analyticsSelectors = { analytics: slice.selectors };

export type AnalyticsStoreState = StateFromReducersMapObject<
  typeof analyticsReducers
>;
