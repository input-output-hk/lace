import {
  createAction,
  createSlice,
  type WritableDraft,
} from '@reduxjs/toolkit';

import { stateMachine } from './state-machine';
import { computeUnlockBackoffMs } from './unlock-backoff';

import type { AuthenticationPromptEvent } from './state-machine';
import type { AuthenticationPromptSliceState } from './types';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

export type { AuthenticationPromptSliceState };

type AuthenticationPromptState = {
  authenticationPrompt: AuthenticationPromptSliceState;
  isDeviceAuthAvailable?: boolean;
  deviceAuthReady: boolean;
  /**
   * Count of consecutive failed password verifications. Drives unlock
   * backoff (NWL R1 audit L-201); reset to 0 on a successful verification.
   * Persisted so the throttle survives extension / service-worker restarts.
   */
  failedPasswordAttempts: number;
  /**
   * Absolute timestamp (ms epoch) until which unlock is throttled after failed
   * password attempts (NWL R1 audit L-201). 0 = not throttled. Stored as an
   * absolute deadline (not a duration) so the prompt countdown survives
   * remounts, and persisted so the throttle survives extension / service-worker
   * restarts rather than resetting on reload.
   */
  unlockBackoffUntil: number;
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
  (state: WritableDraft<AuthenticationPromptState>, ...params: Params) => {
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
    failedPasswordAttempts: 0,
    unlockBackoffUntil: 0,
  } as AuthenticationPromptState,
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
      completed: makeAuthPromptStateMachineTransitionAction('completed'),
      preempted: makeAuthPromptStateMachineTransitionAction('preempted'),
      biometricAutoFilled: makeAuthPromptStateMachineTransitionAction(
        'biometricAutoFilled',
      ),
      biometricCanceled:
        makeAuthPromptStateMachineTransitionAction('biometricCanceled'),
    } satisfies Record<
      Exclude<
        AuthenticationPromptEvent['type'],
        'verifiedBiometric' | 'verifiedPassword'
      >,
      Function
    >),

    // Custom reducer (not the generated state-machine transition) so it can
    // maintain the consecutive-failure counter and the absolute backoff
    // deadline that drive unlock throttling (NWL R1 audit L-201): reset both on
    // success, and on failure bump the count and set an absolute deadline
    // `at + backoff(count)`. `prepare` stamps the failure time — the standard
    // RTK way to get "now" into an action while keeping the reducer pure — so
    // the deadline is stable across prompt remounts and store rehydration.
    verifiedPassword: {
      prepare: (payload: { success: boolean }) => ({
        payload: { ...payload, at: Date.now() },
      }),
      reducer: (
        state,
        action: PayloadAction<{ success: boolean; at: number }>,
      ) => {
        // A verify can resolve after the prompt already left VerifyingPassword
        // (user cancelled or was preempted mid-flight), in which case the
        // transition below is a no-op. Only touch the L-201 counter when the
        // result actually belongs to the active attempt — otherwise a stale
        // success would clear a live backoff, and a stale failure would inflate
        // it (PR review of #2454, cursor).
        const isVerifying =
          state.authenticationPrompt.status === 'VerifyingPassword';
        state.authenticationPrompt = stateMachine.transition(
          state.authenticationPrompt,
          stateMachine.events.verifiedPassword({
            success: action.payload.success,
          }),
        );
        if (!isVerifying) return;
        if (action.payload.success) {
          state.failedPasswordAttempts = 0;
          state.unlockBackoffUntil = 0;
        } else {
          state.failedPasswordAttempts += 1;
          state.unlockBackoffUntil =
            action.payload.at +
            computeUnlockBackoffMs(state.failedPasswordAttempts);
        }
      },
    },

    // Custom reducer so a successful biometric unlock also clears the
    // consecutive-failure counter (L-201). Without this, unlocking by
    // biometrics after failed password attempts would leave the password
    // backoff armed for the next password entry (PR review, cursor). Biometric
    // failures don't touch the password counter.
    verifiedBiometric: (
      state,
      action: PayloadAction<
        Parameters<typeof stateMachine.events.verifiedBiometric>[0]
      >,
    ) => {
      // Guard against a stale result as in verifiedPassword above: only clear
      // the counter when this success belongs to the active biometric attempt,
      // so a late success can't wipe a live L-201 backoff.
      const isVerifyingBiometric =
        state.authenticationPrompt.status === 'VerifyingBiometric';
      state.authenticationPrompt = stateMachine.transition(
        state.authenticationPrompt,
        stateMachine.events.verifiedBiometric(action.payload),
      );
      if (isVerifyingBiometric && action.payload.success) {
        state.failedPasswordAttempts = 0;
        state.unlockBackoffUntil = 0;
      }
    },

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
    /** Consecutive failed password verifications; drives unlock backoff (L-201). */
    selectFailedPasswordAttempts: state => state.failedPasswordAttempts,
    /**
     * Absolute timestamp (ms epoch) until which unlock is throttled (L-201), or
     * 0 when not throttled. The prompt counts down to it to disable submit and
     * show "try again in Ns"; being an absolute deadline, it survives prompt
     * remounts and store rehydration.
     */
    selectUnlockBackoffUntil: state => state.unlockBackoffUntil,
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
