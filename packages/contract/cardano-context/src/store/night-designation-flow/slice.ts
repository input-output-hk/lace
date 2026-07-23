import { createStateMachineSlice } from '@lace-lib/util-store';

import { nightDesignationFlowMachine } from './state-machine';

import type { NightDesignationFlowSliceState } from './types';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

export type { NightDesignationFlowSliceState };

export const slice = createStateMachineSlice(nightDesignationFlowMachine, {
  selectors: {
    selectState: (state: Readonly<NightDesignationFlowSliceState>) => state,
  },
});

export const nightDesignationFlowReducers = {
  [slice.name]: slice.reducer,
};

export const nightDesignationFlowActions = {
  nightDesignationFlow: slice.actions,
};

export const nightDesignationFlowSelectors = {
  nightDesignationFlow: slice.selectors,
};

export type NightDesignationFlowStoreState = StateFromReducersMapObject<
  typeof nightDesignationFlowReducers
>;
