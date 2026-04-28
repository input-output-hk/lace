import { createStateMachineSlice } from '@lace-lib/util-store';

import { collateralFlowMachine } from './state-machine';

import type { CollateralFlowSliceState } from './types';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

export type { CollateralFlowSliceState };

export const slice = createStateMachineSlice(collateralFlowMachine, {
  selectors: {
    selectState: (state: Readonly<CollateralFlowSliceState>) => state,
  },
});

export const collateralFlowReducers = {
  [slice.name]: slice.reducer,
};

export const collateralFlowActions = {
  collateralFlow: slice.actions,
};

export const collateralFlowSelectors = {
  collateralFlow: slice.selectors,
};

export type CollateralFlowStoreState = StateFromReducersMapObject<
  typeof collateralFlowReducers
>;
