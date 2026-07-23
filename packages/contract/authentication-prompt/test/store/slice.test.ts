import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authenticationPromptSelectors as selectors } from '../../src';
import {
  authenticationPromptActions,
  authenticationPromptReducers,
} from '../../src/store/slice';

import type { AuthenticationPromptStatus, Config } from '../../src';
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

  describe('verifiedPassword failed-attempt counter (L-201)', () => {
    const config: Config = {
      purpose: 'wallet-unlock',
      confirmButtonLabel: 'authentication-prompt.confirm-button-label',
      message: 'authentication-prompt.message.wallet-lock',
    };

    const readAttempts = (store: ReturnType<typeof createStore>) =>
      selectors.authenticationPrompt.selectFailedPasswordAttempts(
        store.getState(),
      );

    const enterVerifyingPassword = (store: ReturnType<typeof createStore>) => {
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.confirmedPassword(),
      );
    };

    const openPasswordPrompt = (store: ReturnType<typeof createStore>) => {
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.requested(config),
      );
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.openedPassword(),
      );
    };

    it('starts at zero', () => {
      expect(readAttempts(createStore())).toBe(0);
    });

    it('increments on each consecutive failed verification', () => {
      const store = createStore();
      openPasswordPrompt(store);

      enterVerifyingPassword(store);
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.verifiedPassword({
          success: false,
        }),
      );
      expect(readAttempts(store)).toBe(1);

      // A failure returns the machine to OpenPassword; re-confirm to retry.
      enterVerifyingPassword(store);
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.verifiedPassword({
          success: false,
        }),
      );
      expect(readAttempts(store)).toBe(2);
    });

    it('resets to zero on a successful verification', () => {
      const store = createStore();
      openPasswordPrompt(store);

      enterVerifyingPassword(store);
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.verifiedPassword({
          success: false,
        }),
      );
      expect(readAttempts(store)).toBe(1);

      enterVerifyingPassword(store);
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.verifiedPassword({
          success: true,
        }),
      );
      expect(readAttempts(store)).toBe(0);
    });

    it('resets to zero when the user unlocks via biometrics instead', () => {
      const store = createStore();
      openPasswordPrompt(store);

      enterVerifyingPassword(store);
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.verifiedPassword({
          success: false,
        }),
      );
      expect(readAttempts(store)).toBe(1);

      // Switch to biometrics and succeed; the password backoff counter must
      // still clear, otherwise the next password entry stays throttled (L-201).
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.switchToBiometric(),
      );
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.confirmedBiometric(),
      );
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.verifiedBiometric({
          success: true,
        }),
      );
      expect(readAttempts(store)).toBe(0);
    });
  });

  describe('verifiedPassword unlock-backoff deadline (L-201)', () => {
    const config: Config = {
      purpose: 'wallet-unlock',
      confirmButtonLabel: 'authentication-prompt.confirm-button-label',
      message: 'authentication-prompt.message.wallet-lock',
    };

    // Fixed wall-clock so the deadline `verifiedPassword` stamps via `Date.now()`
    // in its `prepare` is deterministic.
    const NOW = 1_700_000_000_000;

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const readBackoffUntil = (store: ReturnType<typeof createStore>) =>
      selectors.authenticationPrompt.selectUnlockBackoffUntil(store.getState());

    const failOnce = (store: ReturnType<typeof createStore>) => {
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.confirmedPassword(),
      );
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.verifiedPassword({
          success: false,
        }),
      );
    };

    const openPasswordPrompt = (store: ReturnType<typeof createStore>) => {
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.requested(config),
      );
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.openedPassword(),
      );
    };

    it('starts unthrottled', () => {
      expect(readBackoffUntil(createStore())).toBe(0);
    });

    it('sets an absolute deadline of now + backoff(attempts) on failure', () => {
      vi.spyOn(Date, 'now').mockReturnValue(NOW);
      const store = createStore();
      openPasswordPrompt(store);

      failOnce(store);
      // 1st failure → 1s backoff
      expect(readBackoffUntil(store)).toBe(NOW + 1000);

      failOnce(store);
      // 2nd failure → 2s backoff
      expect(readBackoffUntil(store)).toBe(NOW + 2000);
    });

    it('clears the deadline on a successful verification', () => {
      vi.spyOn(Date, 'now').mockReturnValue(NOW);
      const store = createStore();
      openPasswordPrompt(store);

      failOnce(store);
      expect(readBackoffUntil(store)).toBe(NOW + 1000);

      store.dispatch(
        authenticationPromptActions.authenticationPrompt.confirmedPassword(),
      );
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.verifiedPassword({
          success: true,
        }),
      );
      expect(readBackoffUntil(store)).toBe(0);
    });

    it('clears the deadline when the user unlocks via biometrics instead', () => {
      vi.spyOn(Date, 'now').mockReturnValue(NOW);
      const store = createStore();
      openPasswordPrompt(store);

      failOnce(store);
      expect(readBackoffUntil(store)).toBe(NOW + 1000);

      store.dispatch(
        authenticationPromptActions.authenticationPrompt.switchToBiometric(),
      );
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.confirmedBiometric(),
      );
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.verifiedBiometric({
          success: true,
        }),
      );
      expect(readBackoffUntil(store)).toBe(0);
    });

    it('ignores a stale password verify that arrives when not actively verifying', () => {
      vi.spyOn(Date, 'now').mockReturnValue(NOW);
      // The no-op transition logs; silence it to keep the test output clean.
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const store = createStore();
      openPasswordPrompt(store);

      // Arm a real backoff, which leaves the prompt back in OpenPassword.
      failOnce(store);
      expect(readBackoffUntil(store)).toBe(NOW + 1000);

      // A verify that resolves late (prompt is OpenPassword, not
      // VerifyingPassword) must not clear the live backoff on success...
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.verifiedPassword({
          success: true,
        }),
      );
      expect(readBackoffUntil(store)).toBe(NOW + 1000);
      expect(
        selectors.authenticationPrompt.selectFailedPasswordAttempts(
          store.getState(),
        ),
      ).toBe(1);

      // ...nor inflate it on failure.
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.verifiedPassword({
          success: false,
        }),
      );
      expect(readBackoffUntil(store)).toBe(NOW + 1000);
      expect(
        selectors.authenticationPrompt.selectFailedPasswordAttempts(
          store.getState(),
        ),
      ).toBe(1);
    });

    it('ignores a stale biometric success that arrives when not actively verifying', () => {
      vi.spyOn(Date, 'now').mockReturnValue(NOW);
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const store = createStore();
      openPasswordPrompt(store);

      failOnce(store);
      expect(readBackoffUntil(store)).toBe(NOW + 1000);

      // Biometric success arriving while in OpenPassword (not
      // VerifyingBiometric) must not wipe the live password backoff.
      store.dispatch(
        authenticationPromptActions.authenticationPrompt.verifiedBiometric({
          success: true,
        }),
      );
      expect(readBackoffUntil(store)).toBe(NOW + 1000);
      expect(
        selectors.authenticationPrompt.selectFailedPasswordAttempts(
          store.getState(),
        ),
      ).toBe(1);
    });
  });
});
