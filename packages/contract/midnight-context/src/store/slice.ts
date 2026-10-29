import { featuresSelectors } from '@lace-contract/feature';
import { markParameterizedSelector } from '@lace-contract/module';
import { networkSelectors } from '@lace-contract/network';
import { Serializable } from '@lace-lib/util-store';
import { NetworkId } from '@midnightntwrk/wallet-sdk-abstractions';
import { createAction, createSelector, createSlice } from '@reduxjs/toolkit';
import merge from 'lodash/merge';

import {
  DEFAULT_NETWORKS_CONFIG,
  defaultLocalProofServerMode,
  EMPTY_PARTIAL_NETWORKS_CONFIG,
  FEATURE_FLAG_MIDNIGHT_INDEXER_URLS,
  FEATURE_FLAG_MIDNIGHT_NODE_URLS,
  FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
  FEATURE_FLAG_MIDNIGHT_TEE_TEMENOS_PROOF_SERVER,
  TEMENOS_PROOF_SERVER_MODES,
  REMOTE_PROOF_SERVER_MODES,
} from '../const';
import { MidnightSDKNetworkId } from '../const';
import {
  isSameProofServerMode,
  proofServerDisclosureKey,
} from '../proof-server-mode';
import { getValidNetworkStringPayload } from '../utils';
import { MidnightNetworkId } from '../value-objects';

import { proofActivitySlice } from './proof-activity-slice';
import { teeAttestationSlice } from './tee-attestation-slice';

import type {
  MidnightNetworkConfig,
  PartialMidnightNetworksConfig,
} from '../const';
import type { ProofServerMode } from '../proof-server-mode';
import type {
  DustGenerationDetails,
  MidnightAccountPublicKeys,
  MidnightContextSliceState,
  MidnightNetwork,
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
  supportsWasmProver: false,
  proofServerDisclosureAcknowledgements: {},
  defaultTestNetNetworkId: NetworkId.NetworkId.Preview,
  defaultNetworksConfig: DEFAULT_NETWORKS_CONFIG,
  userNetworksConfigOverrides: EMPTY_PARTIAL_NETWORKS_CONFIG,
  isActivityPageHeaderBannerDismissed: false,
  isPortfolioBannerDismissed: false,
  supportedNetworksIds: [...MidnightSDKNetworkId],
  dustBalanceByAccount: {},
  dustAvailableByAccount: {},
  dustGenerationDetailsByAccount: {},
  publicKeysByAccount: {},
};

const slice = createSlice({
  name: 'midnightContext',
  initialState,
  reducers: {
    acknowledgeProofServerDisclosure: (
      state,
      { payload }: PayloadAction<ProofServerMode>,
    ) => {
      const key = proofServerDisclosureKey(payload);
      if (key) {
        state.proofServerDisclosureAcknowledgements ??= {};
        state.proofServerDisclosureAcknowledgements[key] = true;
      }
    },
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
      const baseProofServer: ProofServerMode | undefined =
        baseNetworkConfig.proofServer;
      if (
        config.proofServer &&
        (!baseProofServer ||
          !isSameProofServerMode(baseProofServer, config.proofServer))
      ) {
        userNetworksConfigOverrides.proofServer = config.proofServer;
      } else {
        delete userNetworksConfigOverrides.proofServer;
      }
    },

    setSupportedNetworksIds: (
      state,
      { payload }: PayloadAction<MidnightSDKNetworkId[]>,
    ) => {
      state.supportedNetworksIds = payload;
    },

    /**
     * Sets the proof server each listed network proves with by default. A
     * default is one of the modes a user override may select, so a loadout's
     * own prover belongs here rather than in the user overrides; a user
     * override of an available mode still takes precedence over it.
     */
    setDefaultProofServers: (
      state,
      {
        payload,
      }: PayloadAction<Partial<Record<MidnightSDKNetworkId, ProofServerMode>>>,
    ) => {
      for (const [networkId, proofServer] of Object.entries(payload) as [
        MidnightSDKNetworkId,
        ProofServerMode | undefined,
      ][]) {
        const networkConfig = state.defaultNetworksConfig[networkId];
        if (networkConfig && proofServer)
          networkConfig.proofServer = proofServer;
      }
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
    selectSupportsWasmProver: state => state.supportsWasmProver,
    selectProofServerDisclosureAcknowledgements: state =>
      state.proofServerDisclosureAcknowledgements,
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

    selectPublicKeysByAccount: state => state.publicKeysByAccount,
  },
});

const selectPublicKeysByAccountId = markParameterizedSelector(
  createSelector(
    slice.selectors.selectPublicKeysByAccount,
    (_: unknown, accountId: MidnightAccountId) => accountId,
    (publicKeysByAccount, accountId) => publicKeysByAccount[accountId],
  ),
);

const selectDustGenerationDetails = markParameterizedSelector(
  createSelector(
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
  ),
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
 * Every string config field a feature flag can override, and the flag that
 * carries it. These — and `proofServer`, derived from the remote proof-server
 * options below — must stay on this derived path: a field routed through a
 * side effect into `userNetworksConfigOverrides` instead shadows later flag
 * changes and is indistinguishable from a genuine user setting.
 */
const NETWORK_CONFIG_FEATURE_FLAG_KEYS: [
  'indexerAddress' | 'nodeAddress',
  FeatureFlagKey,
][] = [
  ['nodeAddress', FEATURE_FLAG_MIDNIGHT_NODE_URLS],
  ['indexerAddress', FEATURE_FLAG_MIDNIGHT_INDEXER_URLS],
];

/**
 * Derives the list of remote proof server options per network from the
 * boolean `BLOCKCHAIN_MIDNIGHT_REMOTE_PROOF_SERVER` feature flag. URLs and
 * display metadata come exclusively from the source-controlled catalogue.
 * Legacy URL payloads are deliberately ignored.
 */
const selectRemoteProofServerOptions = createSelector(
  featuresSelectors.features.selectLoadedFeatures,
  slice.selectors.selectSupportedNetworksIds,
  (
    loadedFeatures,
    supportedNetworksIds,
  ): Partial<
    Record<
      MidnightSDKNetworkId,
      Extract<ProofServerMode, { kind: 'delegated' }>[]
    >
  > => {
    const { featureFlags } = loadedFeatures;
    const proofServerFlag = featureFlags.find(
      f => f.key === FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
    );
    if (!proofServerFlag) return {};
    const result: Partial<
      Record<
        MidnightSDKNetworkId,
        Extract<ProofServerMode, { kind: 'delegated' }>[]
      >
    > = {};
    for (const networkId of supportedNetworksIds) {
      const mode = REMOTE_PROOF_SERVER_MODES[networkId];
      if (mode) result[networkId] = [mode];
    }
    return result;
  },
);

/**
 * Derives feature flag network config overrides directly from loaded features.
 * Since loaded features ARE persisted, this selector produces the correct value
 * immediately on startup — eliminating the oscillation caused by the previous
 * approach (Redux state populated by an async side effect).
 */
const selectNetworksConfigFeatureFlagsOverrides = createSelector(
  selectRemoteProofServerOptions,
  featuresSelectors.features.selectLoadedFeatures,
  slice.selectors.selectSupportedNetworksIds,
  (
    remoteProofServerOptions,
    loadedFeatures,
    supportedNetworksIds,
  ): PartialMidnightNetworksConfig => {
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
      // The single `proofServer` field tracks the *default* — the first
      // remote in the list when one is configured. Users can still pick
      // another mode in the settings UI, which goes through user overrides.
      const firstRemote = remoteProofServerOptions[networkId]?.[0];
      if (firstRemote) {
        config.proofServer = {
          kind: 'delegated',
          url: firstRemote.url,
          label: firstRemote.label,
          ...(firstRemote.descriptionKey
            ? { descriptionKey: firstRemote.descriptionKey }
            : {}),
        };
      }
      result[networkId] = config;
    }
    return result;
  },
);

/**
 * The Temenos TEE option is build-baked; this remote boolean flag decides
 * whether it is offered and — as the kill switch — whether an already
 * persisted `tee-delegated` selection is still honoured.
 */
const selectIsTemenosProofServerEnabled = createSelector(
  featuresSelectors.features.selectLoadedFeatures,
  loadedFeatures =>
    loadedFeatures.featureFlags.some(
      f => f.key === FEATURE_FLAG_MIDNIGHT_TEE_TEMENOS_PROOF_SERVER,
    ),
);

/**
 * All proof server modes available for a given network, ordered by
 * trust-tier section (on-device first, delegated last). Drives the
 * settings UI directly — sections collapse to empty when no entries
 * qualify (e.g. no WASM support, no paired phone, no flag-provided
 * remotes).
 */
const selectAllProofServerModes = createSelector(
  slice.selectors.selectNetworksDefaultConfig,
  selectRemoteProofServerOptions,
  createSelector(
    selectIsTemenosProofServerEnabled,
    slice.selectors.selectSupportsWasmProver,
    (isTemenosEnabled, supportsWasmProver) => ({
      isTemenosEnabled,
      supportsWasmProver,
    }),
  ),
  (
    defaultNetworksConfig,
    remoteProofServerOptions,
    { isTemenosEnabled, supportsWasmProver },
  ): Partial<Record<MidnightSDKNetworkId, ProofServerMode[]>> => {
    // The Temenos TEE entry is build-baked, never payload-delivered: the
    // boolean flag controls availability without supplying provider URLs.
    const result: Partial<Record<MidnightSDKNetworkId, ProofServerMode[]>> = {};
    for (const [id, config] of Object.entries(defaultNetworksConfig)) {
      const networkId = id as MidnightSDKNetworkId;
      const modes: ProofServerMode[] = [];
      if (supportsWasmProver) modes.push({ kind: 'in-process' });
      // Preserve the existing default; WASM is an explicit opt-in.
      modes.push(config.proofServer ?? defaultLocalProofServerMode);
      // Source-controlled delegated providers enabled by their boolean flag.
      for (const remote of remoteProofServerOptions[networkId] ?? []) {
        modes.push({
          kind: 'delegated',
          url: remote.url,
          label: remote.label,
          ...(remote.descriptionKey
            ? { descriptionKey: remote.descriptionKey }
            : {}),
        });
      }
      const temenosMode = TEMENOS_PROOF_SERVER_MODES[networkId];
      if (isTemenosEnabled && temenosMode) {
        modes.push(temenosMode);
      }
      result[networkId] = modes;
    }
    return result;
  },
);

/** Only currently available source-controlled modes can override the default.
 * Legacy persisted URLs and disabled providers must not bypass the catalogue. */
const selectHonouredUserNetworksConfigOverrides = createSelector(
  slice.selectors.selectNetworksConfigUserOverrides,
  selectAllProofServerModes,
  (overrides, modes) => {
    const result = { ...overrides };
    for (const id of Object.keys(overrides)) {
      const networkId = id as MidnightSDKNetworkId;
      const override = overrides[networkId];
      if (!override?.proofServer) continue;
      const { proofServer, ...rest } = override;
      const canonical = modes[networkId]?.find(mode =>
        isSameProofServerMode(mode, proofServer),
      );
      result[networkId] = canonical
        ? { ...rest, proofServer: canonical }
        : rest;
    }
    return result;
  },
);

const selectUnavailableProofServerNetworks = createSelector(
  slice.selectors.selectNetworksConfigUserOverrides,
  selectHonouredUserNetworksConfigOverrides,
  (overrides, honoured) =>
    (Object.keys(overrides) as MidnightSDKNetworkId[]).filter(
      networkId =>
        overrides[networkId]?.proofServer && !honoured[networkId]?.proofServer,
    ),
);

const selectNetworksConfig = createSelector(
  slice.selectors.selectNetworksDefaultConfig,
  selectNetworksConfigFeatureFlagsOverrides,
  selectHonouredUserNetworksConfigOverrides,
  (
    defaultNetworkConfig,
    featureFlagsNetworksConfigOverrides,
    userNetworksConfigOverrides,
  ) => {
    const result = merge(
      {},
      defaultNetworkConfig,
      featureFlagsNetworksConfigOverrides,
      userNetworksConfigOverrides,
    );
    for (const id of Object.keys(defaultNetworkConfig)) {
      const networkId = id as MidnightSDKNetworkId;
      result[networkId].proofServer =
        userNetworksConfigOverrides[networkId]?.proofServer ??
        featureFlagsNetworksConfigOverrides[networkId]?.proofServer ??
        defaultNetworkConfig[networkId].proofServer;
    }
    return result;
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
  [teeAttestationSlice.name]: teeAttestationSlice.reducer,
  [proofActivitySlice.name]: proofActivitySlice.reducer,
};

/**
 * Per-account "reset sync state" intent. Lives on the contract (not a module
 * slice) because two different modules implement it — `@lace-module/midnight-sync`
 * for the monolith engine and `@lace-module/midnight-host-pull` for the shell
 * guest — and modules cannot subscribe to another module's actions (ADR 14).
 */
const resetSyncState = createAction<{ accountId: AccountId }>(
  'midnight/resetSyncState',
);

export const midnightContextActions = {
  midnightContext: {
    ...slice.actions,
    ...teeAttestationSlice.actions,
    ...proofActivitySlice.actions,
    resetSyncState,
  },
};

export const midnightContextSelectors = {
  midnightContext: {
    ...slice.selectors,
    ...teeAttestationSlice.selectors,
    ...proofActivitySlice.selectors,
    selectMidnightBlockchainNetworkId,
    selectNetworkId,
    selectInitialNetworkId,
    selectNetworksConfig,
    selectNetworksConfigFeatureFlagsOverrides,
    selectRemoteProofServerOptions,
    selectAllProofServerModes,
    selectUnavailableProofServerNetworks,
    selectIsTemenosProofServerEnabled,
    selectCurrentNetwork,
    selectDustGenerationDetails,
    selectPublicKeysByAccountId,
  },
};

export type MidnightContextStoreState = StateFromReducersMapObject<
  typeof midnightContextReducers
>;
