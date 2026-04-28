import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';

import { authenticationPromptSelectors as selectors } from '../../src';
import {
  authenticationPromptActions,
  authenticationPromptReducers,
} from '../../src/store/slice';

import type { AuthenticationPromptStatus } from '../../src';
import type { State } from '@lace-contract/module';

const createStore = () =>
  configureStore({ reducer: authenticationPromptReducers });

const makeState = (
  overrides: Partial<{
    status: AuthenticationPromptStatus;
    isDeviceAuthAvailable: boolean;
    deviceAuthReady: boolean;
  }> = {},
) =>
  ({
    authenticationPrompt: {
      authenticationPrompt: { status: overrides.status ?? 'Idle' },
      isDeviceAuthAvailable: overrides.isDeviceAuthAvailable,
      deviceAuthReady: overrides.deviceAuthReady ?? false,
    },
  } as State);

describe('authenticationPrompt slice', () => {
  describe('selectors', () => {
    it('isAvailable gives true if prompt is not already open', () => {
      const stateNameMap: Record<AuthenticationPromptStatus, string> = {
        Idle: '',
        Preparing: '',
        OpenPassword: '',
        VerifyingPassword: '',
        BiometricRequired: '',
        OpenBiometric: '',
        VerifyingBiometric: '',
        Completing: '',
      };
      for (const status of Object.keys(stateNameMap)) {
        expect(
          selectors.authenticationPrompt.isAvailable(
            makeState({ status: status as AuthenticationPromptStatus }),
          ),
        ).toEqual(status === 'Idle');
      }
    });

    it('selectDeviceAuthAvailable returns undefined before availability is set', () => {
      expect(
        selectors.authenticationPrompt.selectDeviceAuthAvailable(makeState()),
      ).toBeUndefined();
    });

    it('selectDeviceAuthAvailable returns the stored value', () => {
      expect(
        selectors.authenticationPrompt.selectDeviceAuthAvailable(
          makeState({ isDeviceAuthAvailable: true }),
        ),
      ).toBe(true);
    });

    it('selectAwaitingBiometricSetup is falsy when device auth availability is unknown', () => {
      expect(
        selectors.authenticationPrompt.selectAwaitingBiometricSetup(
          makeState(),
        ),
      ).toBeFalsy();
    });

    it('selectAwaitingBiometricSetup is true when device auth becomes available before setup completes', () => {
      expect(
        selectors.authenticationPrompt.selectAwaitingBiometricSetup(
          makeState({ isDeviceAuthAvailable: true, deviceAuthReady: false }),
        ),
      ).toBe(true);
    });

    it('selectAwaitingBiometricSetup is false once device auth is ready', () => {
      expect(
        selectors.authenticationPrompt.selectAwaitingBiometricSetup(
          makeState({ isDeviceAuthAvailable: true, deviceAuthReady: true }),
        ),
      ).toBe(false);
    });

    it('selectAwaitingBiometricSetup is false when device auth is unavailable', () => {
      expect(
        selectors.authenticationPrompt.selectAwaitingBiometricSetup(
          makeState({ isDeviceAuthAvailable: false, deviceAuthReady: false }),
        ),
      ).toBe(false);
    });

    it('selectShowBiometricUnlockOffer is falsy when device auth unavailable', () => {
      expect(
        selectors.authenticationPrompt.selectShowBiometricUnlockOffer(
          makeState({ isDeviceAuthAvailable: false }),
        ),
      ).toBe(false);
    });

    it('selectShowBiometricUnlockOffer is true when device auth is available and ready', () => {
      expect(
        selectors.authenticationPrompt.selectShowBiometricUnlockOffer(
          makeState({
            isDeviceAuthAvailable: true,
            deviceAuthReady: true,
          }),
        ),
      ).toBe(true);
    });

    it('selectShowBiometricUnlockOffer is false when awaiting biometric setup', () => {
      expect(
        selectors.authenticationPrompt.selectShowBiometricUnlockOffer(
          makeState({
            isDeviceAuthAvailable: true,
            deviceAuthReady: false,
          }),
        ),
      ).toBe(false);
    });
  });

  describe('updateBiometricInfo', () => {
    it('sets isDeviceAuthAvailable and leaves deviceAuthReady false by default', () => {
      const store = createStore();

      store.dispatch(
        authenticationPromptActions.authenticationPrompt.updateBiometricInfo({
          isDeviceAuthAvailable: true,
        }),
      );

      expect(store.getState().authenticationPrompt.isDeviceAuthAvailable).toBe(
        true,
      );
      expect(store.getState().authenticationPrompt.deviceAuthReady).toBe(false);
    });

    it('overwrites previous isDeviceAuthAvailable values', () => {
      const store = createStore();

      store.dispatch(
        authenticationPromptActions.authenticationPrompt.updateBiometricInfo({
          isDeviceAuthAvailable: true,
        }),
      );
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.updateBiometricInfo({
          isDeviceAuthAvailable: false,
        }),
      );

      expect(store.getState().authenticationPrompt.isDeviceAuthAvailable).toBe(
        false,
      );
    });

    it('resets deviceAuthReady to false when device auth becomes unavailable', () => {
      const store = createStore();

      store.dispatch(
        authenticationPromptActions.authenticationPrompt.setDeviceAuthReady({
          deviceAuthReady: true,
        }),
      );
      expect(store.getState().authenticationPrompt.deviceAuthReady).toBe(true);

      store.dispatch(
        authenticationPromptActions.authenticationPrompt.updateBiometricInfo({
          isDeviceAuthAvailable: false,
        }),
      );

      expect(store.getState().authenticationPrompt.deviceAuthReady).toBe(false);
    });

    it('keeps deviceAuthReady true when device auth remains available', () => {
      const store = createStore();

      store.dispatch(
        authenticationPromptActions.authenticationPrompt.setDeviceAuthReady({
          deviceAuthReady: true,
        }),
      );
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.updateBiometricInfo({
          isDeviceAuthAvailable: true,
        }),
      );

      expect(store.getState().authenticationPrompt.deviceAuthReady).toBe(true);
    });

    it('setDeviceAuthReady sets deviceAuthReady to the provided value', () => {
      const store = createStore();

      expect(store.getState().authenticationPrompt.deviceAuthReady).toBe(false);

      store.dispatch(
        authenticationPromptActions.authenticationPrompt.setDeviceAuthReady({
          deviceAuthReady: true,
        }),
      );
      expect(store.getState().authenticationPrompt.deviceAuthReady).toBe(true);

      store.dispatch(
        authenticationPromptActions.authenticationPrompt.setDeviceAuthReady({
          deviceAuthReady: false,
        }),
      );
      expect(store.getState().authenticationPrompt.deviceAuthReady).toBe(false);
    });
  });
});
