import type { AuthSecret } from '../value-objects';
import type { TranslationKey } from '@lace-contract/i18n';
import type { StateObject } from '@lace-lib/util-store';
import type { Observable } from 'rxjs';
import type { SetOptional } from 'type-fest';

export type AuthenticationPromptStatus =
  | 'BiometricRequired'
  | 'Completing'
  | 'Idle'
  | 'OpenBiometric'
  | 'OpenPassword'
  | 'Preparing'
  | 'VerifyingBiometric'
  | 'VerifyingPassword';

export type AuthPromptPurpose = 'action-authorization' | 'wallet-unlock';

export type Config = {
  purpose: AuthPromptPurpose;
  cancellable?: boolean;
  confirmButtonLabel: TranslationKey;
  message: TranslationKey;
  biometricsUnavailable?: boolean;
};

export type AuthenticationPromptSliceStateIdle = StateObject<'Idle'>;

export type AuthenticationPromptSliceStatePreparing = StateObject<
  'Preparing',
  { config: Config }
>;

export type AuthenticationPromptSliceStateOpen = StateObject<
  'OpenBiometric' | 'OpenPassword',
  {
    config: Config;
    authSecretError: boolean;
    /**
     * When present, indicates the Android Keystore PIN fallback bug is active.
     * The user must authenticate with biometrics only (no PIN).
     * Shows the retry count (1-3) and warning message.
     */
    androidKeystoreRecovery?: {
      attemptNumber: number;
      maxAttempts: number;
    };
  }
>;

export type AuthenticationPromptSliceStateVerifying = StateObject<
  'VerifyingBiometric' | 'VerifyingPassword',
  {
    config: Config;
  }
>;

export type AuthenticationPromptSliceStateCompleting = StateObject<
  'Completing',
  {
    config: Config;
    success: boolean;
  }
>;

export type AuthenticationPromptSliceStateBiometricRequired = StateObject<
  'BiometricRequired',
  {
    config: Config;
  }
>;

export type AuthenticationPromptSliceState =
  | AuthenticationPromptSliceStateBiometricRequired
  | AuthenticationPromptSliceStateCompleting
  | AuthenticationPromptSliceStateIdle
  | AuthenticationPromptSliceStateOpen
  | AuthenticationPromptSliceStatePreparing
  | AuthenticationPromptSliceStateVerifying;

export type AuthSecretVerifier = {
  verifyAuthSecret: (params: { authSecret: AuthSecret }) => Promise<boolean>;
};

export type AccessAuthSecret = <T>(
  callback: (authSecret: AuthSecret) => Observable<T>,
) => Observable<T>;
export type Authenticate = (
  config: SetOptional<Config, 'purpose'>,
) => Observable<boolean>;

export type AuthenticationPromptSideEffectDependencies = {
  accessAuthSecret: AccessAuthSecret;
  authenticate: Authenticate;
};
