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
};

export type BiometricAuthPromptUIHandles = {
  onCancel: () => void;
  onConfirm: () => void;
  state: AuthenticationPromptSliceState;
  triggerPasswordFlow: ActionCreatorWithoutPayload<'authenticationPrompt/switchToPassword'>;
};
