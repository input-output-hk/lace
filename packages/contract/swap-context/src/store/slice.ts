import { createStateMachineSlice } from '@lace-lib/util-store';
import { createSlice } from '@reduxjs/toolkit';

import { swapFlowMachine } from './state-machine';

import type { SwapConfigState } from './types';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';
import type * as _immer from 'immer'; // NOSONAR: required so immer's WritableDraft types are referenceable in emitted .d.ts files

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

// --- Analytics slice (in-memory, not persisted) ---

/**
 * Stable identifier for a single user pass through the swap funnel. Generated
 * fresh on every `swapFlow.reset` (the swap UI mounts/unmounts) and attached
 * to every funnel event so PostHog can compute drop-off between
 * `swaps | select token` → `swaps | fetch estimate` → `swaps | review tx`
 * → `swaps | sign success/failure` without relying on PostHog session
 * boundaries (which can include unrelated activity).
 */
type SwapAnalyticsState = {
  swapSessionId: string | undefined;
};

const analyticsSlice = createSlice({
  name: 'swapAnalytics',
  initialState: { swapSessionId: undefined } as SwapAnalyticsState,
  reducers: {
    swapSessionStarted: (
      state,
      { payload }: Readonly<PayloadAction<string>>,
    ) => {
      state.swapSessionId = payload;
    },
  },
  selectors: {
    selectSwapSessionId: ({ swapSessionId }) => swapSessionId,
  },
});

// --- Combined exports ---

export const swapContextReducers = {
  [swapFlowSlice.name]: swapFlowSlice.reducer,
  [configSlice.name]: configSlice.reducer,
  [analyticsSlice.name]: analyticsSlice.reducer,
};

export const swapContextActions = {
  swapFlow: swapFlowSlice.actions,
  swapConfig: configSlice.actions,
  swapAnalytics: analyticsSlice.actions,
};

export const swapContextSelectors = {
  swapFlow: swapFlowSlice.selectors,
  swapConfig: configSlice.selectors,
  swapAnalytics: analyticsSlice.selectors,
};

export type SwapContextStoreState = StateFromReducersMapObject<
  typeof swapContextReducers
>;
