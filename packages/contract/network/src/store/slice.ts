import { featuresSelectors } from '@lace-contract/feature';
import { markParameterizedSelector } from '@lace-contract/module';
import { createSelector, createSlice } from '@reduxjs/toolkit';

import { isFeatureAvailableForNetwork } from '../network-restrictions';

import type { NetworkSliceState, NetworkType, TestnetOption } from './types';
import type { BlockchainNetworkId, FeatureId } from '../value-objects';
import type { BlockchainName } from '@lace-lib/util-store';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';
import type * as _immer from 'immer';

export type { NetworkSliceState };

export const initialState: NetworkSliceState = {
  networkType: 'testnet',
  initialNetworkType: 'testnet',
  blockchainNetworks: {},
  testnetOptions: {},
};

const slice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setNetworkType: (
      state,
      { payload }: Readonly<PayloadAction<NetworkType>>,
    ) => {
      state.networkType = payload;
    },
    setInitialNetworkType: (
      state,
      { payload }: Readonly<PayloadAction<NetworkType>>,
    ) => {
      state.initialNetworkType = payload;
    },
    setTestnetOptions: (
      state,
      {
        payload,
      }: Readonly<
        PayloadAction<{
          blockchainName: BlockchainName;
          options: TestnetOption[];
        }>
      >,
    ) => {
      state.testnetOptions[payload.blockchainName] = payload.options;
    },
    setBlockchainNetworks: (
      state,
      {
        payload,
      }: Readonly<
        PayloadAction<{
          blockchain: BlockchainName;
          mainnet: BlockchainNetworkId;
          testnet: BlockchainNetworkId;
        }>
      >,
    ) => {
      state.blockchainNetworks[payload.blockchain] = {
        mainnet: payload.mainnet,
        testnet: payload.testnet,
      };
    },
  },
  selectors: {
    selectNetworkType: ({ networkType }) => networkType,
    selectInitialNetworkType: ({ initialNetworkType }) => initialNetworkType,
    selectBlockchainNetworks: ({ blockchainNetworks }) => blockchainNetworks,
    selectTestnetOptions: ({ testnetOptions }) => testnetOptions,
  },
});

const selectAllTestnetOptions = createSelector(
  slice.selectors.selectTestnetOptions,
  testnetOptions =>
    Object.entries(testnetOptions).map(([blockchainName, options]) => ({
      blockchainName: blockchainName as BlockchainName,
      options,
    })),
);

const selectActiveNetworkId = markParameterizedSelector(
  createSelector(
    slice.selectors.selectBlockchainNetworks,
    slice.selectors.selectNetworkType,
    (_: unknown, blockchain: BlockchainName) => blockchain,
    (blockchainNetworks, networkType, blockchain) =>
      blockchainNetworks[blockchain]?.[networkType],
  ),
);

const selectAllActiveNetworkIds = createSelector(
  slice.selectors.selectBlockchainNetworks,
  slice.selectors.selectNetworkType,
  (blockchainNetworks, networkType) =>
    Object.values(blockchainNetworks).map(
      networkConfig => networkConfig[networkType],
    ),
);

/**
 * Changes whenever any network slice data changes
 */
const selectNetworkKey = createSelector(
  slice.selectors.selectNetworkType,
  slice.selectors.selectBlockchainNetworks,
  (networkType, blockchainNetworks) =>
    `${networkType}:${JSON.stringify(blockchainNetworks)}`,
);

/**
 * Check if a feature is available based on network type and feature flags.
 * Combines network restrictions with feature flag checks.
 */
const selectIsFeatureAvailable = markParameterizedSelector(
  createSelector(
    slice.selectors.selectNetworkType,
    featuresSelectors.features.selectLoadedFeatures,
    (_: unknown, featureId: FeatureId) => featureId,
    (networkType, loadedFeatures, featureId) =>
      isFeatureAvailableForNetwork(
        featureId,
        networkType,
        loadedFeatures.featureFlags,
      ),
  ),
);

export const networkReducers = {
  network: slice.reducer,
};

export const networkActions = {
  network: slice.actions,
};

export const networkSelectors = {
  network: {
    ...slice.selectors,
    selectNetworkKey,
    selectActiveNetworkId,
    selectAllActiveNetworkIds,
    selectIsFeatureAvailable,
    selectAllTestnetOptions,
  },
};

export type NetworkStoreState = StateFromReducersMapObject<
  typeof networkReducers
>;

export type BlockchainTestnetOptions = ReturnType<
  typeof selectAllTestnetOptions
>[0];
