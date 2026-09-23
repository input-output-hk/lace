import { createStateMachineSlice } from '@lace-lib/util-store';

import { composerFlowMachine } from './state-machine';

import type { ComposerFlowSliceState } from './types';

export type { ComposerFlowSliceState };

export const slice = createStateMachineSlice(composerFlowMachine, {
  selectors: {
    selectState: (state: Readonly<ComposerFlowSliceState>) => state,
  },
});

export const composerFlowReducers = {
  [slice.name]: slice.reducer,
};

export const composerFlowActions = {
  composerFlow: slice.actions,
};

export const composerFlowSelectors = {
  composerFlow: slice.selectors,
};
