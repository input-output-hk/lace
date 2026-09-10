import { createSlice } from '@reduxjs/toolkit';

import type { JsonType } from '@lace-lib/util-store';
import type { ActionCreatorWithPayload, PayloadAction } from '@reduxjs/toolkit';

export type IdentifiedUser = {
  userId: string;
  properties: Record<string, JsonType>;
};

export type PosthogAnalyticsSliceState = {
  identifiedUser: IdentifiedUser | null;
};

const initialState: PosthogAnalyticsSliceState = { identifiedUser: null };

const slice = createSlice({
  name: 'posthogAnalytics',
  initialState,
  reducers: {
    identified: (state, { payload }: PayloadAction<IdentifiedUser>) => {
      // Mirror of the person PostHog holds, so it merges the way `identify`
      // does: a payload omitting a key (governance data before it loads, or on
      // testnet) leaves the remote value in place. Replacing wholesale would
      // drop the key here and make the next identify look like a change.
      const previous = state.identifiedUser;
      if (previous !== null && previous.userId === payload.userId) {
        Object.assign(previous.properties, payload.properties);
        return;
      }
      state.identifiedUser = payload;
    },
  },
  selectors: {
    selectIdentifiedUser: (state: Readonly<PosthogAnalyticsSliceState>) =>
      state.identifiedUser,
  },
});

export const posthogAnalyticsReducers = {
  [slice.name]: slice.reducer,
};

// Explicit annotation: the inferred action-creator types reference immer's
// Draft of the recursive JsonType, a private name that declaration emit
// cannot reference (TS4023).
export const posthogAnalyticsActions: {
  posthogAnalytics: {
    identified: ActionCreatorWithPayload<
      IdentifiedUser,
      'posthogAnalytics/identified'
    >;
  };
} = {
  posthogAnalytics: slice.actions,
};

export const posthogAnalyticsSelectors = {
  posthogAnalytics: slice.selectors,
};
