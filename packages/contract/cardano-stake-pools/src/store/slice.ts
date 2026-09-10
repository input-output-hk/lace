import { cardanoContextSelectors } from '@lace-contract/cardano-context';
import {
  createAction,
  createSelector,
  createSlice,
  type PayloadAction,
  type StateFromReducersMapObject,
} from '@reduxjs/toolkit';

import type {
  LacePartialStakePool,
  LaceStakePool,
  StakePoolsNetworkData,
} from '../types';
import type { Cardano } from '@cardano-sdk/core';
import type { CardanoNetworkId } from '@lace-contract/cardano-context';

export type NetworkRecord<T> = Partial<Record<CardanoNetworkId, T>>;

/**
 * A pool the user picked in the browse/details picker on behalf of another
 * flow. `selectionId` names the consumer (e.g. `earn-rewards:<accountId>`),
 * because the picker is one shared surface — a consumer must never act on a
 * pick made for someone else. Deliberately NOT persisted (see init.ts's
 * whitelist): a pick is an instruction to a live flow, and replaying one into
 * a cold start would delegate on the strength of an abandoned session.
 * Display fields ride along so the consumer can state the choice (ticker,
 * estimated rate) without re-fetching the pool.
 *
 * This slice is the handshake's home because both sides may already depend on
 * this contract, and modules never import each other (ADR 14): the picker
 * (staking-center) only ever dispatches `poolSelectionMade`, and each consumer
 * watches for its own `selectionId` and clears the slot when its flow is done.
 */
export type PoolSelection = {
  selectionId: string;
  poolId: Cardano.PoolId;
  ticker: string | null;
  poolName: string | null;
  /** Estimated annual rate as a fraction, from the details screen's figure. */
  ros?: number;
};

export type CardanoStakePoolsState = {
  networkData: NetworkRecord<StakePoolsNetworkData>;
  poolDetails: NetworkRecord<Record<Cardano.PoolId, LaceStakePool>>;
  poolSummaries: NetworkRecord<LacePartialStakePool[]>;
  poolSelection?: PoolSelection;
};

export const initialState: CardanoStakePoolsState = {
  networkData: {},
  poolDetails: {},
  poolSummaries: {},
};

type RPA<T> = Readonly<PayloadAction<T>>;

const slice = createSlice({
  name: 'cardanoStakePools',
  initialState,
  reducers: {
    deletePoolDetails: (
      state,
      payload: RPA<{ network: CardanoNetworkId; poolId: Cardano.PoolId }>,
    ) => {
      const { network, poolId } = payload.payload;
      const networkDetails = state.poolDetails[network];

      if (!networkDetails || !networkDetails[poolId]) return;

      delete networkDetails[poolId];
      state.poolDetails = {
        ...state.poolDetails,
        [network]: { ...networkDetails },
      };
    },
    setNetworkData: (
      state,
      payload: RPA<{ network: CardanoNetworkId; data: StakePoolsNetworkData }>,
    ) => {
      const { network, data } = payload.payload;
      state.networkData = { ...state.networkData, [network]: data };
    },
    setPoolDetails: (
      state,
      payload: RPA<{ network: CardanoNetworkId; pool: LaceStakePool }>,
    ) => {
      const { network, pool } = payload.payload;
      state.poolDetails = {
        ...state.poolDetails,
        [network]: { ...state.poolDetails[network], [pool.poolId]: pool },
      };
    },
    setPoolSummaries: (
      state,
      payload: RPA<{
        network: CardanoNetworkId;
        summaries: LacePartialStakePool[];
      }>,
    ) => {
      const { network, summaries } = payload.payload;
      state.poolSummaries = { ...state.poolSummaries, [network]: summaries };
    },
    /** The picker made a choice for the named consumer. Last write wins: a
     * second pick before the first is consumed is the user changing their
     * mind, not a conflict. */
    poolSelectionMade: (state, payload: RPA<PoolSelection>) => {
      state.poolSelection = payload.payload;
    },
    /**
     * Cleared by the CONSUMER when its flow no longer needs the choice —
     * cancelled, completed, or superseded — and id-checked so a consumer
     * tearing down cannot discard a pick just made for a different flow.
     */
    poolSelectionCleared: (state, payload: RPA<{ selectionId: string }>) => {
      if (state.poolSelection?.selectionId !== payload.payload.selectionId)
        return;
      state.poolSelection = undefined;
    },
  },
  selectors: {
    selectNetworkData: state => state.networkData,
    selectPoolDetails: state => state.poolDetails,
    selectPoolSummaries: state => state.poolSummaries,
    selectPoolSelection: state => state.poolSelection,
  },
});

const { selectBlockchainNetworkId } = cardanoContextSelectors.cardanoContext;
const { selectNetworkData, selectPoolDetails, selectPoolSummaries } =
  slice.selectors;

const selectActiveNetworkData = createSelector(
  selectBlockchainNetworkId,
  selectNetworkData,
  (networkId, networkData) => (networkId ? networkData[networkId] : undefined),
);

const selectActivePoolDetails = createSelector(
  selectBlockchainNetworkId,
  selectPoolDetails,
  (networkId, pools) => (networkId ? pools[networkId] : undefined),
);

const selectActivePoolSummaries = createSelector(
  selectBlockchainNetworkId,
  selectPoolSummaries,
  (networkId, list) => (networkId ? list[networkId] : undefined),
);

export const cardanoStakePoolsReducers = {
  [slice.name]: slice.reducer,
};

export const cardanoStakePoolsActions = {
  cardanoStakePools: {
    ...slice.actions,
    loadPools: createAction<Cardano.PoolId[]>('cardanoStakePools/loadPools'),
  },
};

export const cardanoStakePoolsSelectors = {
  cardanoStakePools: {
    ...slice.selectors,
    selectActivePoolSummaries,
    selectActiveNetworkData,
    selectActivePoolDetails,
  },
};

export type CardanoStakePoolsStoreState = StateFromReducersMapObject<
  typeof cardanoStakePoolsReducers
>;
