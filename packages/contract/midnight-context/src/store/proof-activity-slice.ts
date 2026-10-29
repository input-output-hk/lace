import { createSlice } from '@reduxjs/toolkit';

import type { ProofActivity } from '@lace-lib/vendor/wasm-proof-backend';
import type { PayloadAction } from '@reduxjs/toolkit';

/** Background-owned summaries, intentionally excluded from persisted wallet state. */
export const proofActivitySlice = createSlice({
  name: 'midnightProofActivities',
  initialState: [] as ProofActivity[],
  reducers: {
    proofActivitiesUpdated: (
      _state,
      { payload }: PayloadAction<ProofActivity[]>,
    ) => payload,
    proofActivityDismissRequested: (
      state,
      { payload }: PayloadAction<string>,
    ) =>
      state.filter(
        activity =>
          activity.id !== payload ||
          (activity.status !== 'succeeded' && activity.status !== 'failed'),
      ),
  },
  selectors: { selectProofActivities: state => state },
});
