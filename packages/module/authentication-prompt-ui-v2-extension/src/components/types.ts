import type {
  AuthenticationPromptSliceState,
  AuthSecret,
} from '@lace-contract/authentication-prompt';
import type { ActionCreatorWithoutPayload } from '@reduxjs/toolkit';

export type PasswordAuthPromptUIHandles = {
  onCancel: () => void;
  onConfirm: (password: AuthSecret) => Promise<void>;
  onSwitchToBiometric: () => void;
  state: AuthenticationPromptSliceState;
  /** When true, show the "use biometrics" action on the password prompt. */
  shouldShowBiometricUnlockOffer?: boolean;
  /**
   * Absolute timestamp (ms epoch) until which unlock is throttled after failed
   * password attempts (L-201). While it's in the future the prompt disables
   * submit and shows a "too many attempts, try again in Ns" countdown.
   * Optional; absent/0/past = no throttle.
   */
  unlockBackoffUntil?: number;
};

export type BiometricAuthPromptUIHandles = {
  onCancel: () => void;
  onConfirm: () => void;
  state: AuthenticationPromptSliceState;
  triggerPasswordFlow: ActionCreatorWithoutPayload<'authenticationPrompt/switchToPassword'>;
};
