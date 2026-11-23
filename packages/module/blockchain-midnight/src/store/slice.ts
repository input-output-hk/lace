import {
  createStateMachine,
  createStateMachineSlice,
} from '@lace-lib/util-store';

import type {
  PendingDustNullifiersByAccount,
  MidnightNetworkConfig,
  MidnightSDKNetworkId,
} from '@lace-contract/midnight-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { StateObject } from '@lace-lib/util-store';

type SettingsChange = {
  config: MidnightNetworkConfig;
  networkId: MidnightSDKNetworkId;
};

export type MidnightSettingsDrawerState =
  | StateObject<
      'ConfirmDustReset',
      SettingsChange & {
        pendingDust: PendingDustNullifiersByAccount;
      }
    >
  | StateObject<
      'Open',
      { hasSaveFailed?: boolean; unreadableSnapshotAccountId?: AccountId }
    >
  | StateObject<
      'Saving',
      SettingsChange & {
        authorizedPendingDustNullifiers?: PendingDustNullifiersByAccount;
      }
    >
  | StateObject<'Closed'>;

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
        closeSettings: state => state,
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
      ConfirmDustReset: {
        cancelDustReset: () => ({ status: 'Open' }),
        closeSettings: () => ({ status: 'Closed' }),
        confirmDustReset: ({ config, networkId, pendingDust }) => ({
          status: 'Saving',
          config,
          networkId,
          authorizedPendingDustNullifiers: pendingDust,
        }),
      },
      Saving: {
        closeSettings: () => ({ status: 'Closed' }),
        dustResetConfirmationRequired: (
          { config, networkId },
          pendingDust: PendingDustNullifiersByAccount,
        ) => ({
          status: 'ConfirmDustReset',
          config,
          networkId,
          pendingDust,
        }),
        snapshotUnreadable: (_, accountId: AccountId) => ({
          status: 'Open',
          hasSaveFailed: true,
          unreadableSnapshotAccountId: accountId,
        }),
        savingFailed: () => ({ status: 'Open', hasSaveFailed: true }),
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

/** Direct import of this is an anti-pattern. OK for tests. */
export const midnightActions = {
  midnight: {
    ...slice.actions,
  },
};

export const midnightSelectors = {
  midnight: slice.selectors,
};
