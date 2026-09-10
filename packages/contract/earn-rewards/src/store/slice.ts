import { createStateMachineSlice } from '@lace-lib/util-store';

import { earnRewardsFlowMachine } from './state-machine';

import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

const earnRewardsFlowSlice = createStateMachineSlice(earnRewardsFlowMachine, {
  selectors: {
    selectEarnRewardsFlowState: state => state,
  },
});

export const earnRewardsReducers = {
  [earnRewardsFlowSlice.name]: earnRewardsFlowSlice.reducer,
};

export const earnRewardsActions = {
  earnRewardsFlow: earnRewardsFlowSlice.actions,
};

export const earnRewardsSelectors = {
  earnRewardsFlow: earnRewardsFlowSlice.selectors,
};

export type EarnRewardsStoreState = StateFromReducersMapObject<
  typeof earnRewardsReducers
>;
