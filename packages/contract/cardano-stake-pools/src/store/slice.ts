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
export type CardanoStakePoolsState = {
  networkData: NetworkRecord<StakePoolsNetworkData>;
  poolDetails: NetworkRecord<Record<Cardano.PoolId, LaceStakePool>>;
  poolSummaries: NetworkRecord<LacePartialStakePool[]>;
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
  },
  selectors: {
    selectNetworkData: state => state.networkData,
    selectPoolDetails: state => state.poolDetails,
    selectPoolSummaries: state => state.poolSummaries,
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
