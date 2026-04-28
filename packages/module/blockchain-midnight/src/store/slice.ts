import {
  createStateMachine,
  createStateMachineSlice,
} from '@lace-lib/util-store';
import { createAction } from '@reduxjs/toolkit';

import type {
  MidnightNetworkConfig,
  MidnightSDKNetworkId,
} from '@lace-contract/midnight-context';
import type { StateObject } from '@lace-lib/util-store';

export type MidnightSettingsDrawerState =
  | StateObject<
      'Saving',
      {
        config: MidnightNetworkConfig;
        networkId: MidnightSDKNetworkId;
      }
    >
  | StateObject<'Closed' | 'Open'>;

export type MidnightSettingsDrawerStatus =
  MidnightSettingsDrawerState['status'];

const midnightSettingsDrawerStateInitialState = {
  status: 'Closed',
} as MidnightSettingsDrawerState;

const slice = createStateMachineSlice(
  createStateMachine(
    'midnightSettingsDrawer',
    midnightSettingsDrawerStateInitialState,
    {
      Closed: {
        openSettings: () => ({
          status: 'Open',
        }),
      },
      Open: {
        closeSettings: () => ({
          status: 'Closed',
        }),
        confirmSettings: (
          _,
          {
            config,
            networkId,
          }: { config: MidnightNetworkConfig; networkId: MidnightSDKNetworkId },
        ) => ({
          config,
          networkId,
          status: 'Saving',
        }),
      },
      Saving: {
        savingCompleted: () => ({
          status: 'Closed',
        }),
      },
    },
  ),
  {
    selectors: {
      selectSettingsDrawerState: sliceState => sliceState,
    },
  },
);

export const midnightReducers = {
  [slice.name]: slice.reducer,
};

const requestResync = createAction('midnight/requestResync');

const resync = createAction('midnight/resync');

const restartWalletWatch = createAction('midnight/restartWalletWatch');

/** Direct import of this is an anti-pattern. OK for tests. */
export const midnightActions = {
  midnight: {
    ...slice.actions,
    requestResync,
    resync,
    restartWalletWatch,
  },
};

export const midnightSelectors = {
  midnight: slice.selectors,
};
