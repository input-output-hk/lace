import { createStateMachineSlice } from '@lace-lib/util-store';
import { createSlice } from '@reduxjs/toolkit';

import { sendFlowMachine } from './state-machine';

import type { SendFlowFeatureFlagPayload } from '../const';
import type { RecipientSource, SendFlowSliceState } from '../types';
import type { NetworkType } from '@lace-contract/network';
import type { BlockchainName } from '@lace-lib/util-store';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

export type { SendFlowSliceState };

const sendFlowSlice = createStateMachineSlice(sendFlowMachine, {
  selectors: {
    selectSendFlowState: state => state,
  },
});

type SendFlowConfigSliceState = {
  featureFlagPayload: SendFlowFeatureFlagPayload | undefined;
};

const sendFlowConfigSlice = createSlice({
  name: 'sendFlowConfig',
  initialState: {
    featureFlagPayload: undefined,
  } as SendFlowConfigSliceState,
  reducers: {
    setFeatureFlagPayload: (
      state,
      { payload }: PayloadAction<SendFlowFeatureFlagPayload>,
    ) => {
      state.featureFlagPayload = payload;
    },
  },
});

/**
 * Tracks how the user supplied the recipient address for the current send
 * session. Lives outside the state machine because it carries provenance
 * across state transitions (Form → Summary → Processing) and is not part of
 * form data validation. Cleared whenever a new send flow is opened so the
 * source attached to a `send | transaction | success/failure` event always
 * reflects the most recent user action within the same session.
 */
type SendFlowAnalyticsSliceState = {
  recipientSource: RecipientSource | undefined;
};

const sendFlowAnalyticsSlice = createSlice({
  name: 'sendFlowAnalytics',
  initialState: {
    recipientSource: undefined,
  } as SendFlowAnalyticsSliceState,
  reducers: {
    recipientSourceTracked: (
      state,
      { payload }: PayloadAction<RecipientSource>,
    ) => {
      state.recipientSource = payload;
    },
    recipientSourceCleared: state => {
      state.recipientSource = undefined;
    },
  },
});

const selectIsSendFlowEnabledForNetworkType = (
  state: SendFlowStoreState,
  context: {
    blockchainName: BlockchainName | undefined;
    networkType: NetworkType | undefined;
  },
): boolean => {
  const { blockchainName, networkType } = context;

  if (!blockchainName || !networkType) {
    return false;
  }

  const payload = state.sendFlowConfig.featureFlagPayload;

  if (payload === undefined) {
    return false;
  }

  if (Object.keys(payload).length === 0) {
    return false;
  }

  const blockchainConfig = payload[blockchainName];

  if (!blockchainConfig) {
    return false;
  }

  const isNetworkTypeEnabled = blockchainConfig[networkType];

  return isNetworkTypeEnabled ?? false;
};

export const sendFlowReducers = {
  [sendFlowSlice.name]: sendFlowSlice.reducer,
  [sendFlowConfigSlice.name]: sendFlowConfigSlice.reducer,
  [sendFlowAnalyticsSlice.name]: sendFlowAnalyticsSlice.reducer,
};

export const sendFlowActions = {
  sendFlow: sendFlowSlice.actions,
  sendFlowConfig: sendFlowConfigSlice.actions,
  sendFlowAnalytics: sendFlowAnalyticsSlice.actions,
};

export const sendFlowSelectors = {
  sendFlow: sendFlowSlice.selectors,
  sendFlowConfig: {
    selectFeatureFlagPayload: (state: SendFlowStoreState) =>
      state.sendFlowConfig.featureFlagPayload,
    selectIsSendFlowEnabledForNetworkType,
  },
  sendFlowAnalytics: {
    selectRecipientSource: (state: SendFlowStoreState) =>
      state.sendFlowAnalytics.recipientSource,
  },
};

export type SendFlowStoreState = StateFromReducersMapObject<
  typeof sendFlowReducers
>;
