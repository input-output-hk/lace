import { createSlice } from '@reduxjs/toolkit';

import { DEFAULT_INACTIVITY_TIMEOUT_MS } from '../const';

import { lockStateMachine } from './state-machine';

import type { LockState, LockStateMachineEvent } from './state-machine';
export type { LockState } from './state-machine';
import type { HexBytes, Milliseconds } from '@lace-sdk/util';
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

export const appLockReducers = {
  [slice.name]: slice.reducer,
};

export const appLockActions = {
  appLock: slice.actions,
};

export const appLockSelectors = {
  appLock: slice.selectors,
};

export type AppLockStoreState = StateFromReducersMapObject<
  typeof appLockReducers
>;
