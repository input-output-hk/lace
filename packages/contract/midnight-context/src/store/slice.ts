import { featuresSelectors } from '@lace-contract/feature';
import { markParameterizedSelector } from '@lace-contract/module';
import { networkSelectors } from '@lace-contract/network';
import { Serializable } from '@lace-lib/util-store';
import { BigNumber } from '@lace-sdk/util';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { createSelector, createSlice } from '@reduxjs/toolkit';
import merge from 'lodash/merge';

import {
  DEFAULT_NETWORKS_CONFIG,
  EMPTY_PARTIAL_NETWORKS_CONFIG,
  FEATURE_FLAG_MIDNIGHT_INDEXER_URLS,
  FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
} from '../const';
import { MidnightSDKNetworkId } from '../const';
import { createDustToken } from '../dust-token';
import { getValidNetworkStringPayload } from '../utils';
import { MidnightNetworkId } from '../value-objects';

import type {
  MidnightNetworkConfig,
  PartialMidnightNetworksConfig,
} from '../const';
import type {
  DustGenerationDetails,
  MidnightAccountPublicKeys,
  MidnightContextSliceState,
  MidnightNetwork,
  ShouldAcknowledgeMidnightDisclaimer,
} from '../types';
import type { MidnightAccountId } from '../value-objects';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

export type { MidnightContextSliceState };

export const initialState: MidnightContextSliceState = {
  defaultTestNetNetworkId: NetworkId.NetworkId.Preview,
  defaultNetworksConfig: DEFAULT_NETWORKS_CONFIG,
  userNetworksConfigOverrides: EMPTY_PARTIAL_NETWORKS_CONFIG,
  isActivityPageHeaderBannerDismissed: false,
  isPortfolioBannerDismissed: false,
  supportedNetworksIds: [...MidnightSDKNetworkId],
  dustBalanceByAccount: {},
  dustGenerationDetailsByAccount: {},
  shouldAcknowledgeMidnightDisclaimer: 'not-shown',
  publicKeysByAccount: {},
};

const slice = createSlice({
  name: 'midnightContext',
  initialState,
  reducers: {
    /**
     * Takes-in a midnight config and only stores values that are
     * different from the base config (defaults + feature flags).
     * `featureFlagsOverrides` must be provided by the caller (from the derived selector).
     */
    setUserNetworkConfigOverride: (
      state,
      {
        payload,
      }: PayloadAction<{
        networkId: MidnightSDKNetworkId;
        config: Partial<MidnightNetworkConfig>;
        featureFlagsOverrides: Partial<MidnightNetworkConfig>;
      }>,
    ) => {
      const { networkId, config, featureFlagsOverrides } = payload;
      if (!state.supportedNetworksIds.includes(networkId)) {
        return state;
      }

      const baseNetworkConfig = {
        ...state.defaultNetworksConfig[networkId],
        ...featureFlagsOverrides,
      };
      const userNetworksConfigOverrides =
        state.userNetworksConfigOverrides[networkId];

      if (!userNetworksConfigOverrides) return state;

      if (baseNetworkConfig.nodeAddress !== config.nodeAddress) {
        userNetworksConfigOverrides.nodeAddress = config.nodeAddress;
      } else {
        delete userNetworksConfigOverrides.nodeAddress;
      }
      if (baseNetworkConfig.indexerAddress !== config.indexerAddress) {
        userNetworksConfigOverrides.indexerAddress = config.indexerAddress;
      } else {
        delete userNetworksConfigOverrides.indexerAddress;
      }
      if (baseNetworkConfig.proofServerAddress !== config.proofServerAddress) {
        userNetworksConfigOverrides.proofServerAddress =
          config.proofServerAddress;
      } else {
        delete userNetworksConfigOverrides.proofServerAddress;
      }
    },

    setSupportedNetworksIds: (
      state,
      { payload }: PayloadAction<MidnightSDKNetworkId[]>,
    ) => {
      state.supportedNetworksIds = payload;
    },

    dismissActivityPageHeaderBanner: state => {
      state.isActivityPageHeaderBannerDismissed = true;
    },

    dismissPortfolioBanner: state => {
      state.isPortfolioBannerDismissed = true;
    },

    setDustBalance: (
      state,
      {
        payload: { accountId, dustBalance },
      }: PayloadAction<{
        accountId: MidnightAccountId;
        dustBalance: BigNumber;
      }>,
    ) => {
      state.dustBalanceByAccount[accountId] = dustBalance;
    },
    setDustGenerationDetails: {
      reducer: (
        state,
        {
          payload: { accountId, dustGenerationDetails },
        }: PayloadAction<{
          accountId: MidnightAccountId;
          dustGenerationDetails:
            | Serializable<DustGenerationDetails>
            | undefined;
        }>,
      ) => {
        if (dustGenerationDetails === undefined) {
          delete state.dustGenerationDetailsByAccount[accountId];
          return;
        }
        state.dustGenerationDetailsByAccount[accountId] = dustGenerationDetails;
      },
      prepare: ({
        accountId,
        dustGenerationDetails,
      }: {
        accountId: MidnightAccountId;
        dustGenerationDetails: DustGenerationDetails | undefined;
      }) => ({
        payload: {
          accountId,
          dustGenerationDetails: dustGenerationDetails
            ? Serializable.to(dustGenerationDetails)
            : undefined,
        },
      }),
    },
    setShouldAcknowledgeMidnightDisclaimer: (
      state,
      { payload }: PayloadAction<ShouldAcknowledgeMidnightDisclaimer>,
    ) => {
      state.shouldAcknowledgeMidnightDisclaimer = payload;
    },

    setPublicKeys: (
      state,
      {
        payload: { accountId, publicKeys },
      }: PayloadAction<{
        accountId: MidnightAccountId;
        publicKeys: MidnightAccountPublicKeys;
      }>,
    ) => {
      state.publicKeysByAccount[accountId] = publicKeys;
    },

    setNetworkTermsAndConditions: (
      state,
      { payload }: PayloadAction<{ url: string; hash: string } | undefined>,
    ) => {
      state.networkTermsAndConditions = payload;
    },
  },
  selectors: {
    selectNetworksDefaultConfig: state => state.defaultNetworksConfig,

    selectSupportedNetworksIds: state => {
      return state.supportedNetworksIds;
    },

    selectNetworksConfigUserOverrides: state =>
      state.userNetworksConfigOverrides,

    selectIsActivityPageHeaderBannerDismissed: state =>
      state.isActivityPageHeaderBannerDismissed,

    selectIsPortfolioBannerDismissed: state => state.isPortfolioBannerDismissed,

    selectDefaultTestNetNetworkId: state => state.defaultTestNetNetworkId,

    selectDustBalanceByAccount: state => state.dustBalanceByAccount,

    selectSerializedDustGenerationDetailsByAccount: state =>
      state.dustGenerationDetailsByAccount,

    selectShouldAcknowledgeMidnightDisclaimer: state =>
      state.shouldAcknowledgeMidnightDisclaimer,

    selectPublicKeysByAccount: state => state.publicKeysByAccount,

    selectNetworkTermsAndConditions: state => state.networkTermsAndConditions,
  },
});

const selectPublicKeysByAccountId = markParameterizedSelector(
  createSelector(
    slice.selectors.selectPublicKeysByAccount,
    (_: unknown, accountId: MidnightAccountId) => accountId,
    (publicKeysByAccount, accountId) => publicKeysByAccount[accountId],
  ),
);

const selectDustGenerationDetails = createSelector(
  slice.selectors.selectSerializedDustGenerationDetailsByAccount,
  (_: unknown, accountIds: MidnightAccountId[]) => accountIds,
  (allDustGenerationDetails, accountIds) =>
    accountIds.reduce((accumulator, accountId) => {
      const dustGenerationDetails = allDustGenerationDetails[accountId];
      accumulator[accountId] = dustGenerationDetails
        ? Serializable.fromCached(dustGenerationDetails)
        : undefined;
      return accumulator;
    }, {} as Record<MidnightAccountId, DustGenerationDetails | undefined>),
);

const selectMidnightBlockchainNetworkId = createSelector(
  networkSelectors.network.selectNetworkType,
  networkSelectors.network.selectBlockchainNetworks,
  (networkType, blockchainNetworks) =>
    blockchainNetworks['Midnight']?.[networkType] as
      | MidnightNetworkId
      | undefined,
);

/**
 * Derives the active Midnight network ID from the global network store.
 * Returns undefined if Midnight blockchain is not registered.
 */
const selectNetworkId = createSelector(
  networkSelectors.network.selectNetworkType,
  selectMidnightBlockchainNetworkId,
  slice.selectors.selectDefaultTestNetNetworkId,
  (networkType, blockchainNetworkId, defaultTestNetNetworkId) => {
    if (!blockchainNetworkId) {
      // Fallback to default when Midnight not registered yet
      return networkType === 'mainnet'
        ? NetworkId.NetworkId.MainNet
        : defaultTestNetNetworkId;
    }

    return MidnightNetworkId.getNetworkNameId(blockchainNetworkId);
  },
);

/**
 * Derives the Midnight network ID that corresponds to `initialNetworkType`.
 * Used as the preselected network in the onboarding flow so that a new wallet
 * starts on the network intended by the `INITIAL_NETWORK_TYPE` feature flag,
 * regardless of any previously-persisted `networkType` from an earlier wallet.
 */
const selectInitialNetworkId = createSelector(
  networkSelectors.network.selectInitialNetworkType,
  slice.selectors.selectDefaultTestNetNetworkId,
  (initialNetworkType, defaultTestNetNetworkId) =>
    initialNetworkType === 'mainnet'
      ? NetworkId.NetworkId.MainNet
      : defaultTestNetNetworkId,
);

const selectDustToken = createSelector(
  selectNetworkId,
  slice.selectors.selectDustBalanceByAccount,
  (_: unknown, accountId?: MidnightAccountId) => accountId,
  (networkId, dustBalanceByAccount, accountId) =>
    createDustToken(
      networkId,
      (accountId && dustBalanceByAccount[accountId]) ?? BigNumber(0n),
    ),
);

/**
 * Derives feature flag network config overrides directly from loaded features.
 * Since loaded features ARE persisted, this selector produces the correct value
 * immediately on startup — eliminating the oscillation caused by the previous
 * approach (Redux state populated by an async side effect).
 */
const selectNetworksConfigFeatureFlagsOverrides = createSelector(
  featuresSelectors.features.selectLoadedFeatures,
  slice.selectors.selectSupportedNetworksIds,
  (loadedFeatures, supportedNetworksIds): PartialMidnightNetworksConfig => {
    const { featureFlags } = loadedFeatures;
    const proofServerFlag = featureFlags.find(
      f => f.key === FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
    );
    const indexerFlag = featureFlags.find(
      f => f.key === FEATURE_FLAG_MIDNIGHT_INDEXER_URLS,
    );
    const proofOverrides = proofServerFlag
      ? getValidNetworkStringPayload(supportedNetworksIds, proofServerFlag)
      : {};
    const indexerOverrides = indexerFlag
      ? getValidNetworkStringPayload(supportedNetworksIds, indexerFlag)
      : {};

    const result = { ...EMPTY_PARTIAL_NETWORKS_CONFIG };
    for (const networkId of supportedNetworksIds) {
      result[networkId] = {
        ...(proofOverrides[networkId]
          ? { proofServerAddress: proofOverrides[networkId] }
          : {}),
        ...(indexerOverrides[networkId]
          ? { indexerAddress: indexerOverrides[networkId] }
          : {}),
      };
    }
    return result;
  },
);

const selectNetworksConfig = createSelector(
  slice.selectors.selectNetworksDefaultConfig,
  selectNetworksConfigFeatureFlagsOverrides,
  slice.selectors.selectNetworksConfigUserOverrides,
  (
    defaultNetworkConfig,
    featureFlagsNetworksConfigOverrides,
    userNetworksConfigOverrides,
  ) => {
    return merge(
      {},
      defaultNetworkConfig,
      featureFlagsNetworksConfigOverrides,
      userNetworksConfigOverrides,
    );
  },
);

const selectCurrentNetwork = createSelector(
  selectNetworksConfig,
  selectNetworkId,
  (networksConfig, networkId): MidnightNetwork => ({
    networkId,
    config: networksConfig[networkId],
  }),
);

export const midnightContextReducers = {
  [slice.name]: slice.reducer,
};

export const midnightContextActions = {
  midnightContext: {
    ...slice.actions,
  },
};

export const midnightContextSelectors = {
  midnightContext: {
    ...slice.selectors,
    selectMidnightBlockchainNetworkId,
    selectNetworkId,
    selectInitialNetworkId,
    selectDustToken,
    selectNetworksConfig,
    selectNetworksConfigFeatureFlagsOverrides,
    selectCurrentNetwork,
    selectDustGenerationDetails,
    selectPublicKeysByAccountId,
  },
};

export type MidnightContextStoreState = StateFromReducersMapObject<
  typeof midnightContextReducers
>;
