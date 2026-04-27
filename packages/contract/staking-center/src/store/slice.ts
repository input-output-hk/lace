import { createStateMachineSlice } from '@lace-lib/util-store';

import { deregistrationFlowMachine } from './deregistration-state-machine';
import { delegationFlowMachine } from './state-machine';

import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

const delegationFlowSlice = createStateMachineSlice(delegationFlowMachine, {
  selectors: {
    selectDelegationFlowState: state => state,
  },
});

const deregistrationFlowSlice = createStateMachineSlice(
  deregistrationFlowMachine,
  {
    selectors: {
      selectDeregistrationFlowState: state => state,
    },
  },
);

export const stakingCenterReducers = {
  [delegationFlowSlice.name]: delegationFlowSlice.reducer,
  [deregistrationFlowSlice.name]: deregistrationFlowSlice.reducer,
};

export const stakingCenterActions = {
  delegationFlow: delegationFlowSlice.actions,
  deregistrationFlow: deregistrationFlowSlice.actions,
};

export const stakingCenterSelectors = {
  delegationFlow: delegationFlowSlice.selectors,
  deregistrationFlow: deregistrationFlowSlice.selectors,
};

export type StakingCenterStoreState = StateFromReducersMapObject<
  typeof stakingCenterReducers
>;
