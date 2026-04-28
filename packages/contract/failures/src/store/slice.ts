import { markParameterizedSelector } from '@lace-contract/module';
import { createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import type { Failure } from '../types';
import type { FailureId } from '../value-objects';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';
import type * as _immer from 'immer';

export type FailuresSliceState = {
  /**
   * Map of failure ID to failure details.
   * Allows multiple failures to be tracked independently.
   */
  byId: Record<FailureId, Failure>;
};

const initialState: FailuresSliceState = {
  byId: {},
};

const slice = createSlice({
  name: 'failures',
  initialState,
  reducers: {
    /**
     * Add or update a failure in the store.
     * If a failure with the same failureId exists, it will be replaced.
     */
    addFailure: (state, { payload }: PayloadAction<Failure>) => {
      state.byId[payload.failureId] = payload;
    },

    /**
     * Remove a failure from the store by its ID.
     * No-op if the failure doesn't exist.
     */
    dismissFailure: (state, { payload }: PayloadAction<FailureId>) => {
      delete state.byId[payload];
    },
  },
  selectors: {
    /**
     * Select all failures as a record (failureId -> Failure).
     */
    selectAllFailures: ({ byId: failures }) => failures,
  },
});

/**
 * Parameterized selector to get a specific failure by ID.
 * Returns undefined if the failure doesn't exist.
 */
const selectFailureById = markParameterizedSelector(
  createSelector(
    slice.selectors.selectAllFailures,
    (_: unknown, failureId: FailureId) => failureId,
    (failures, failureId): Failure | undefined => failures[failureId],
  ),
);

export const failuresReducers = {
  [slice.name]: slice.reducer,
};

export const failuresActions = {
  failures: slice.actions,
};

export const failuresSelectors = {
  failures: {
    ...slice.selectors,
    selectFailureById,
  },
};

export type FailuresStoreState = StateFromReducersMapObject<
  typeof failuresReducers
>;
