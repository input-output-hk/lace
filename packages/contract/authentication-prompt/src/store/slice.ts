import {
  createAction,
  createSlice,
  type WritableDraft,
} from '@reduxjs/toolkit';

import { stateMachine } from './state-machine';

import type { AuthenticationPromptEvent } from './state-machine';
import type { AuthenticationPromptSliceState } from './types';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

export type { AuthenticationPromptSliceState };

type State = {
  authenticationPrompt: AuthenticationPromptSliceState;
  isDeviceAuthAvailable?: boolean;
  deviceAuthReady: boolean;
};

const makeAuthPromptStateMachineTransitionAction =
  <
    GivenEventType extends AuthenticationPromptEvent['type'],
    GivenEvent extends AuthenticationPromptEvent & {
      type: GivenEventType;
    },
    Params extends GivenEvent extends { payload: unknown }
      ? [PayloadAction<GivenEvent['payload']>]
      : [],
  >(
    eventName: GivenEventType,
  ) =>
  (state: WritableDraft<State>, ...params: Params) => {
    state.authenticationPrompt = stateMachine.transition(
      state.authenticationPrompt,
      stateMachine.events[eventName](
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        ...(params[0]?.payload
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ([params[0]?.payload] as [any])
          : ([] as unknown as [never])),
      ),
    );
  };

const slice = createSlice({
  name: stateMachine.name,
  initialState: {
    authenticationPrompt: stateMachine.initialState,
    deviceAuthReady: false,
  } as State,
  reducers: {
    ...({
      requested: makeAuthPromptStateMachineTransitionAction('requested'),
      cancelled: makeAuthPromptStateMachineTransitionAction('cancelled'),
      openedPassword:
        makeAuthPromptStateMachineTransitionAction('openedPassword'),
      openedBiometric:
        makeAuthPromptStateMachineTransitionAction('openedBiometric'),
      biometricRequired:
        makeAuthPromptStateMachineTransitionAction('biometricRequired'),
      goToSettings: makeAuthPromptStateMachineTransitionAction('goToSettings'),
      confirmedPassword:
        makeAuthPromptStateMachineTransitionAction('confirmedPassword'),
      confirmedBiometric:
        makeAuthPromptStateMachineTransitionAction('confirmedBiometric'),
      switchToPassword:
        makeAuthPromptStateMachineTransitionAction('switchToPassword'),
      switchToBiometric:
        makeAuthPromptStateMachineTransitionAction('switchToBiometric'),
      verifiedPassword:
        makeAuthPromptStateMachineTransitionAction('verifiedPassword'),
      verifiedBiometric:
        makeAuthPromptStateMachineTransitionAction('verifiedBiometric'),
      completed: makeAuthPromptStateMachineTransitionAction('completed'),
      preempted: makeAuthPromptStateMachineTransitionAction('preempted'),
      biometricAutoFilled: makeAuthPromptStateMachineTransitionAction(
        'biometricAutoFilled',
      ),
      biometricCanceled:
        makeAuthPromptStateMachineTransitionAction('biometricCanceled'),
    } satisfies Record<AuthenticationPromptEvent['type'], Function>),

    updateBiometricInfo: (
      state,
      {
        payload: { isDeviceAuthAvailable },
      }: PayloadAction<{ isDeviceAuthAvailable: boolean }>,
    ) => {
      state.deviceAuthReady = isDeviceAuthAvailable && state.deviceAuthReady;
      state.isDeviceAuthAvailable = isDeviceAuthAvailable;
    },

    setDeviceAuthReady: (
      state,
      {
        payload: { deviceAuthReady },
      }: PayloadAction<{ deviceAuthReady: boolean }>,
    ) => {
      state.deviceAuthReady = deviceAuthReady;
    },
  },
  selectors: {
    isAvailable: ({ authenticationPrompt: { status } }) => status === 'Idle',
    isOpen: ({ authenticationPrompt: { status } }) => status !== 'Idle',
    selectState: state => state.authenticationPrompt,
    /**
     * Whether the app can use hardware-backed secure storage with OS authentication.
     * - iOS: true if passcode OR biometrics are enrolled
     * - Android: true ONLY if biometrics (fingerprint/face) are enrolled
     *
     * Use this for UI routing (biometric flow vs password entry).
     */
    selectDeviceAuthAvailable: state => state.isDeviceAuthAvailable,
    selectAwaitingBiometricSetup: state =>
      state.isDeviceAuthAvailable && !state.deviceAuthReady,
    selectShowBiometricUnlockOffer: state =>
      state.isDeviceAuthAvailable && state.deviceAuthReady,
  },
});

export const authenticationPromptReducers = {
  [slice.name]: slice.reducer,
};

export const authenticationPromptActions = {
  authenticationPrompt: {
    ...slice.actions,
    checkBiometricAvailability: createAction(
      `${slice.name}/checkBiometricAvailability`,
    ),
  },
};

export const authenticationPromptSelectors = {
  authenticationPrompt: slice.selectors,
};

export type AuthenticationPromptStoreState = StateFromReducersMapObject<
  typeof authenticationPromptReducers
>;
