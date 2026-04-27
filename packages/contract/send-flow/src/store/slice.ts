import { createStateMachineSlice } from '@lace-lib/util-store';
import { createSlice } from '@reduxjs/toolkit';

import { sendFlowMachine } from './state-machine';

import type { SendFlowFeatureFlagPayload } from '../const';
import type { SendFlowSliceState } from '../types';
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
};

export const sendFlowActions = {
  sendFlow: sendFlowSlice.actions,
  sendFlowConfig: sendFlowConfigSlice.actions,
};

export const sendFlowSelectors = {
  sendFlow: sendFlowSlice.selectors,
  sendFlowConfig: {
    selectFeatureFlagPayload: (state: SendFlowStoreState) =>
      state.sendFlowConfig.featureFlagPayload,
    selectIsSendFlowEnabledForNetworkType,
  },
};

export type SendFlowStoreState = StateFromReducersMapObject<
  typeof sendFlowReducers
>;
