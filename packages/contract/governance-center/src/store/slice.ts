import { createStateMachineSlice } from '@lace-lib/util-store';
import { createSlice } from '@reduxjs/toolkit';

import { voteDelegationFlowMachine } from './state-machine';

import type { CardanoPromotedNetworkKey, PromotedDRep } from '../const';
import type { DRepSummary } from '@lace-contract/cardano-context';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

const voteDelegationFlowSlice = createStateMachineSlice(
  voteDelegationFlowMachine,
  {
    selectors: {
      selectVoteDelegationFlowState: state => state,
    },
  },
);

type GovernanceCenterConfigState = {
  disclaimerAcknowledged: boolean;
};

const governanceCenterConfigSlice = createSlice({
  name: 'governanceCenterConfig',
  initialState: {
    disclaimerAcknowledged: false,
  } as GovernanceCenterConfigState,
  reducers: {
    acknowledgeDisclaimer: state => {
      state.disclaimerAcknowledged = true;
    },
  },
  selectors: {
    selectDisclaimerAcknowledged: state => state.disclaimerAcknowledged,
  },
});

type DRepsListState = {
  dReps: DRepSummary[];
  isLoading: boolean;
  fetchedAt: number | null;
  // Set when a fetch exhausts its transparent retries. fetchDRepsRequested is
  // user-initiated with no natural trigger, so the UI surfaces this with a
  // manual retry (ADR 15) rather than showing an empty list as "no DReps".
  error: boolean;
};

const dRepsListSlice = createSlice({
  name: 'dRepsList',
  initialState: {
    dReps: [],
    isLoading: false,
    fetchedAt: null,
    error: false,
  } as DRepsListState,
  reducers: {
    fetchDRepsRequested: state => {
      state.isLoading = true;
      state.error = false;
    },
    fetchDRepsSucceeded: (
      state,
      action: PayloadAction<{ dReps: DRepSummary[] }>,
    ) => {
      state.dReps = action.payload.dReps;
      state.isLoading = false;
      state.error = false;
      state.fetchedAt = Date.now();
    },
    fetchDRepsFailed: state => {
      state.isLoading = false;
      state.error = true;
    },
    // DRep registrations are network-specific: a network switch must drop the
    // cached list (and its TTL) so the next visit refetches for the new chain.
    resetDReps: state => {
      state.dReps = [];
      state.isLoading = false;
      state.error = false;
      state.fetchedAt = null;
    },
  },
  selectors: {
    selectDReps: state => state.dReps,
    selectDRepsIsLoading: state => state.isLoading,
    selectDRepsIsInitiallyLoading: state =>
      state.isLoading && state.fetchedAt === null,
    selectDRepsFetchedAt: state => state.fetchedAt,
    selectDRepsHasError: state => state.error,
  },
});

export type DRepStatus = 'active' | 'all' | 'inactive' | 'retired';
export type DRepSortBy = 'status' | 'votingPower';

type DRepsFilterState = {
  status: DRepStatus;
  sortBy: DRepSortBy;
};

const dRepsFilterSlice = createSlice({
  name: 'dRepsFilter',
  initialState: { status: 'all', sortBy: 'votingPower' } as DRepsFilterState,
  reducers: {
    setDRepStatus: (state, action: PayloadAction<{ status: DRepStatus }>) => {
      state.status = action.payload.status;
    },
    setDRepSortBy: (state, action: PayloadAction<{ sortBy: DRepSortBy }>) => {
      state.sortBy = action.payload.sortBy;
    },
  },
  selectors: {
    selectDRepStatus: state => state.status,
    selectDRepSortBy: state => state.sortBy,
  },
});

type PromotedDRepsState = {
  config: Partial<Record<CardanoPromotedNetworkKey, PromotedDRep[]>>;
  activePromoted: PromotedDRep[];
};

// Shared empty fallbacks keep the selectors referentially stable before this
// contract's reducers are injected (async store load).
const EMPTY_PROMOTED_CONFIG: PromotedDRepsState['config'] = {};
const EMPTY_PROMOTED_LIST: PromotedDRep[] = [];

const INITIAL_PROMOTED_DREPS_STATE: PromotedDRepsState = {
  config: EMPTY_PROMOTED_CONFIG,
  activePromoted: EMPTY_PROMOTED_LIST,
};

const promotedDRepsSlice = createSlice({
  name: 'promotedDReps',
  initialState: INITIAL_PROMOTED_DREPS_STATE,
  reducers: {
    setConfig: (
      state,
      action: PayloadAction<
        Partial<Record<CardanoPromotedNetworkKey, PromotedDRep[]>>
      >,
    ) => {
      state.config = action.payload;
    },
    setActivePromoted: (
      state,
      action: PayloadAction<{ promoted: PromotedDRep[] }>,
    ) => {
      state.activePromoted = action.payload.promoted;
    },
  },
  selectors: {
    selectPromotedConfig: (state: PromotedDRepsState | undefined) =>
      state?.config ?? EMPTY_PROMOTED_CONFIG,
    selectActivePromoted: (state: PromotedDRepsState | undefined) =>
      state?.activePromoted ?? EMPTY_PROMOTED_LIST,
  },
});

export const governanceCenterReducers = {
  [voteDelegationFlowSlice.name]: voteDelegationFlowSlice.reducer,
  [governanceCenterConfigSlice.name]: governanceCenterConfigSlice.reducer,
  [dRepsListSlice.name]: dRepsListSlice.reducer,
  [dRepsFilterSlice.name]: dRepsFilterSlice.reducer,
  [promotedDRepsSlice.name]: promotedDRepsSlice.reducer,
};

export const governanceCenterActions = {
  voteDelegationFlow: voteDelegationFlowSlice.actions,
  governanceCenterConfig: governanceCenterConfigSlice.actions,
  dRepsList: dRepsListSlice.actions,
  dRepsFilter: dRepsFilterSlice.actions,
  promotedDReps: promotedDRepsSlice.actions,
};

export const governanceCenterSelectors = {
  voteDelegationFlow: voteDelegationFlowSlice.selectors,
  governanceCenterConfig: governanceCenterConfigSlice.selectors,
  dRepsList: dRepsListSlice.selectors,
  dRepsFilter: dRepsFilterSlice.selectors,
  // `getSelectors` (rather than the bare `.selectors`) with a nullish-safe
  // root-state accessor: RTK's default `.selectors` wrapper indexes
  // `rootState[reducerPath]` directly and throws in non-production builds
  // when that key is absent (e.g. before this contract's reducers have been
  // injected, or when called with `undefined` root state in tests) instead
  // of falling through to the slice's own `?? EMPTY_*` fallbacks.
  promotedDReps: promotedDRepsSlice.getSelectors(
    (state: { promotedDReps?: PromotedDRepsState } | undefined) =>
      state?.promotedDReps ?? INITIAL_PROMOTED_DREPS_STATE,
  ),
};

export type GovernanceCenterStoreState = StateFromReducersMapObject<
  typeof governanceCenterReducers
>;
