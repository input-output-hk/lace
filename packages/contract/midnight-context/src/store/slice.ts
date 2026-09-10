import { featuresSelectors } from '@lace-contract/feature';
import { markParameterizedSelector } from '@lace-contract/module';
import { networkSelectors } from '@lace-contract/network';
import { Serializable } from '@lace-lib/util-store';
import { NetworkId } from '@midnightntwrk/wallet-sdk-abstractions';
import { createAction, createSelector, createSlice } from '@reduxjs/toolkit';
import merge from 'lodash/merge';

import {
  DEFAULT_NETWORKS_CONFIG,
  EMPTY_PARTIAL_NETWORKS_CONFIG,
  FEATURE_FLAG_MIDNIGHT_INDEXER_URLS,
  FEATURE_FLAG_MIDNIGHT_NODE_URLS,
  FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
} from '../const';
import { MidnightSDKNetworkId } from '../const';
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
import type { FeatureFlagKey } from '@lace-contract/feature';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { BigNumber } from '@lace-lib/util';
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
  dustAvailableByAccount: {},
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
        payload: { accountId, dustAvailable, dustBalance },
      }: PayloadAction<{
        accountId: MidnightAccountId;
        /** The spendable subset of `dustBalance` — what a transfer can pay
         * with once a pending build has taken its dust coin. */
        dustAvailable: BigNumber;
        dustBalance: BigNumber;
      }>,
    ) => {
      state.dustBalanceByAccount[accountId] = dustBalance;
      state.dustAvailableByAccount[accountId] = dustAvailable;
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

    /**
     * Clears the sync-derived dust caches (balance and generation details) for
     * one account. Used by the per-account "reset sync state" flow so a stale
     * dust balance can't survive the reset/restart and mislead the user.
     */
    resetAccountDust: (
      state,
      {
        payload: { accountId },
      }: PayloadAction<{ accountId: MidnightAccountId }>,
    ) => {
      delete state.dustBalanceByAccount[accountId];
      delete state.dustAvailableByAccount[accountId];
      delete state.dustGenerationDetailsByAccount[accountId];
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

    selectDustAvailableByAccount: state => state.dustAvailableByAccount,

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

/**
 * Every config field a feature flag can override, and the flag that carries it.
 * All three must stay on this derived path: a field routed through a side effect
 * into `userNetworksConfigOverrides` instead shadows later flag changes and is
 * indistinguishable from a genuine user setting.
 */
const NETWORK_CONFIG_FEATURE_FLAG_KEYS: [
  keyof MidnightNetworkConfig,
  FeatureFlagKey,
][] = [
  ['nodeAddress', FEATURE_FLAG_MIDNIGHT_NODE_URLS],
  ['indexerAddress', FEATURE_FLAG_MIDNIGHT_INDEXER_URLS],
  ['proofServerAddress', FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER],
];

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
    const overridesByConfigKey = NETWORK_CONFIG_FEATURE_FLAG_KEYS.map(
      ([configKey, flagKey]) => {
        const flag = featureFlags.find(f => f.key === flagKey);
        return [
          configKey,
          flag ? getValidNetworkStringPayload(supportedNetworksIds, flag) : {},
        ] as const;
      },
    );

    const result = { ...EMPTY_PARTIAL_NETWORKS_CONFIG };
    for (const networkId of supportedNetworksIds) {
      const config: Partial<MidnightNetworkConfig> = {};
      for (const [configKey, overrides] of overridesByConfigKey) {
        const value = overrides[networkId];
        if (value) config[configKey] = value;
      }
      result[networkId] = config;
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

/**
 * Per-account "reset sync state" intent. Lives on the contract (not a module
 * slice) because two different modules implement it — @lace-module/midnight-sync
 * for the monolith engine and @lace-module/midnight-host-pull for the shell
 * guest — and modules cannot subscribe to another module's actions (ADR 14).
 */
const resetSyncState = createAction<{ accountId: AccountId }>(
  'midnight/resetSyncState',
);

export const midnightContextActions = {
  midnightContext: {
    ...slice.actions,
    resetSyncState,
  },
};

export const midnightContextSelectors = {
  midnightContext: {
    ...slice.selectors,
    selectMidnightBlockchainNetworkId,
    selectNetworkId,
    selectInitialNetworkId,
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
