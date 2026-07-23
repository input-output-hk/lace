import { featuresSelectors } from '@lace-contract/feature';
import { createSelector, createSlice } from '@reduxjs/toolkit';

import {
  PAUSE_NETWORK_POLLING_FEATURE_FLAG,
  DEFAULT_INACTIVITY_TIMEOUT_MS,
} from '../const';

import { lockStateMachine } from './state-machine';

import type { LockState, LockStateMachineEvent } from './state-machine';
export type { LockState } from './state-machine';
import type { HexBytes, Milliseconds } from '@lace-lib/util';
import type {
  PayloadAction,
  StateFromReducersMapObject,
  WritableDraft,
} from '@reduxjs/toolkit';

export type AppLockSliceState = {
  defaultInactivityTimeoutMs: Milliseconds;
  lockState: LockState;
  encryptedSentinel: HexBytes | null;
  inactivityTimeout: Milliseconds | null;
};

export const initialState: AppLockSliceState = {
  lockState: lockStateMachine.initialState,
  encryptedSentinel: null,
  inactivityTimeout: null,
  defaultInactivityTimeoutMs: DEFAULT_INACTIVITY_TIMEOUT_MS,
};

const makeLockStateMachineTransitionAction =
  (eventName: LockStateMachineEvent['type']) =>
  (state: WritableDraft<AppLockSliceState>) => {
    state.lockState = lockStateMachine.transition(
      state.lockState,
      lockStateMachine.events[eventName](),
    );
  };

const slice = createSlice({
  name: 'appLock',
  initialState,
  reducers: {
    ...({
      noSetupRequired: makeLockStateMachineTransitionAction('noSetupRequired'),
      initialSetupRequired: makeLockStateMachineTransitionAction(
        'initialSetupRequired',
      ),
      setupCompleted: makeLockStateMachineTransitionAction('setupCompleted'),
      startUnlocking: makeLockStateMachineTransitionAction('startUnlocking'),
      unlockingSucceeded:
        makeLockStateMachineTransitionAction('unlockingSucceeded'),
      locked: makeLockStateMachineTransitionAction('locked'),
    } satisfies Record<
      Exclude<LockStateMachineEvent['type'], 'reset'>,
      Function
    >),

    reset: state => {
      state.encryptedSentinel = null;
      makeLockStateMachineTransitionAction('reset')(state);
    },

    setEncryptedSentinel: (state, { payload }: PayloadAction<HexBytes>) => {
      state.encryptedSentinel = payload;
    },
    setInactivityTimeout: (state, { payload }: PayloadAction<Milliseconds>) => {
      state.inactivityTimeout = payload;
    },
  },
  selectors: {
    selectLockState: ({ lockState }) => lockState,
    isAwaitingSetup: ({ lockState }) => lockState.status === 'AwaitingSetup',
    isUnlocked: ({ lockState }) => lockState.status === 'Unlocked',
    selectEncryptedSentinel: ({ encryptedSentinel }) => encryptedSentinel,
    selectInactivityTimeout: ({ inactivityTimeout }) => inactivityTimeout,
    selectDefaultInactivityTimeoutMs: ({ defaultInactivityTimeoutMs }) =>
      defaultInactivityTimeoutMs,
  },
});

/**
 * `true` whenever the wallet is in a state that should perform network
 * polling. The truth table has two axes: `lockState.status` and the
 * `PAUSE_NETWORK_POLLING_FEATURE_FLAG` feature flag.
 *
 * When the flag is absent (default), this returns `true` regardless of
 * lock state — preserving today's behaviour. When the flag is present,
 * polling pauses for `Preparing`, `Locked` and `Unlocking` states.
 *
 * `Preparing` is treated as inactive so polling does not fire during the
 * boot window before the lock state machine has decided whether the
 * wallet is locked or awaiting setup. `AwaitingSetup` is treated as
 * active because first-run onboarding may need polling-driven flows.
 *
 * Consumed by the `whileActive` operator. See ADR 25.
 */
const isWalletActive = createSelector(
  slice.selectors.selectLockState,
  featuresSelectors.features.selectLoadedFeatures,
  (lockState, loaded) => {
    const isPauseEnabled = loaded.featureFlags.some(
      flag => flag.key === PAUSE_NETWORK_POLLING_FEATURE_FLAG,
    );
    if (!isPauseEnabled) return true;
    return (
      lockState.status === 'Unlocked' || lockState.status === 'AwaitingSetup'
    );
  },
);

export const appLockReducers = {
  [slice.name]: slice.reducer,
};

export const appLockActions = {
  appLock: slice.actions,
};

export const appLockSelectors = {
  appLock: {
    ...slice.selectors,
    isWalletActive,
  },
};

export type AppLockStoreState = StateFromReducersMapObject<
  typeof appLockReducers
>;
