import { createStateMachineSlice } from '@lace-lib/util-store';
import { createSlice } from '@reduxjs/toolkit';

import { swapFlowMachine } from './state-machine';

import type { SwapConfigState } from './types';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';
import type * as _immer from 'immer';

// --- Swap flow state machine slice ---

const swapFlowSlice = createStateMachineSlice(swapFlowMachine, {
  selectors: {
    selectSwapFlowState: state => state,
  },
});

// --- Config slice (persisted) ---

const configInitialState: SwapConfigState = {
  disclaimerAcknowledged: false,
  ukFcaDisclaimerAcknowledged: false,
  slippage: 0.5,
  excludedDexes: [],
  availableDexes: null,
  tradableTokenIds: null,
  providerTokens: null,
};

const configSlice = createSlice({
  name: 'swapConfig',
  initialState: configInitialState,
  reducers: {
    acknowledgeDisclaimer: state => {
      state.disclaimerAcknowledged = true;
    },
    acknowledgeUkFcaDisclaimer: state => {
      state.ukFcaDisclaimerAcknowledged = true;
    },
    setSlippage: (state, { payload }: Readonly<PayloadAction<number>>) => {
      state.slippage = payload;
    },
    setExcludedDexes: (
      state,
      { payload }: Readonly<PayloadAction<string[]>>,
    ) => {
      state.excludedDexes = payload;
    },
    setAvailableDexes: (
      state,
      { payload }: Readonly<PayloadAction<SwapConfigState['availableDexes']>>,
    ) => {
      state.availableDexes = payload;
    },
    setTradableTokenIds: (
      state,
      { payload }: Readonly<PayloadAction<string[]>>,
    ) => {
      state.tradableTokenIds = payload;
    },
    setProviderTokens: (
      state,
      { payload }: Readonly<PayloadAction<SwapConfigState['providerTokens']>>,
    ) => {
      state.providerTokens = payload;
    },
  },
  selectors: {
    selectDisclaimerAcknowledged: ({ disclaimerAcknowledged }) =>
      disclaimerAcknowledged,
    selectUkFcaDisclaimerAcknowledged: ({ ukFcaDisclaimerAcknowledged }) =>
      ukFcaDisclaimerAcknowledged,
    selectSlippage: ({ slippage }) => slippage,
    selectExcludedDexes: ({ excludedDexes }) => excludedDexes,
    selectAvailableDexes: ({ availableDexes }) => availableDexes,
    selectTradableTokenIds: ({ tradableTokenIds }) => tradableTokenIds,
    selectProviderTokens: ({ providerTokens }) => providerTokens,
  },
});

// --- Combined exports ---

export const swapContextReducers = {
  [swapFlowSlice.name]: swapFlowSlice.reducer,
  [configSlice.name]: configSlice.reducer,
};

export const swapContextActions = {
  swapFlow: swapFlowSlice.actions,
  swapConfig: configSlice.actions,
};

export const swapContextSelectors = {
  swapFlow: swapFlowSlice.selectors,
  swapConfig: configSlice.selectors,
};

export type SwapContextStoreState = StateFromReducersMapObject<
  typeof swapContextReducers
>;
