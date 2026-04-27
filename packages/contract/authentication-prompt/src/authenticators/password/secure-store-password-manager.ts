import { getI18n } from '@lace-contract/i18n';
import { HexBytes } from '@lace-sdk/util';

import { createPasswordFlagManager } from '../../utils/password-flag';
import { AuthSecret } from '../../value-objects';

import type { AuthPromptPurpose } from '../../store';
import type { SecureStore } from '@lace-contract/secure-store';

const PASSWORD_HEX_KEY = 'passwordHex';

/**
 * Creates a secure store password manager that handles biometric-protected passwords.
 *
 * SECURITY: All password operations use `requireAuthentication: true`, which means:
 * - iOS: Uses Keychain with biometryCurrentSet access control (passcode OR biometrics)
 * - Android: Uses Keystore with setUserAuthenticationRequired(true) (biometrics ONLY)
 *
 * IMPORTANT PLATFORM DIFFERENCE:
 * - iOS: `requireAuthentication: true` works with just passcode
 * - Android: `requireAuthentication: true` REQUIRES actual biometrics (fingerprint/face)
 *   Error: "At least one biometric must be enrolled to create keys requiring user
 *   authentication for every use"
 *
 * The OS will enforce biometric/passcode authentication on every access to the password.
 * There is NO separate expo-local-authentication call - the OS handles everything.
 *
 * A separate flag (managed by PasswordFlagManager) indicates whether a password exists,
 * allowing existence checks without triggering authentication.
 */
export const createSecureStorePasswordManager = (secureStore: SecureStore) => {
  const canUseBiometrics = secureStore.canUseBiometricAuthentication();
  const passwordFlagManager = createPasswordFlagManager(secureStore);

  return {
    /**
     * Checks if biometric password storage is available on this device.
     * On iOS: Returns true if passcode OR biometrics are enrolled.
     * On Android: Returns true ONLY if biometrics are enrolled.
     */
    isAvailableAsync: async (): Promise<boolean> => {
      return canUseBiometrics && (await secureStore.isAvailableAsync());
    },

    /**
     * Stores a user-provided password with OS-level protection.
     *
     * Used when:
     * - Auto-generation fails and we fall back to user password
     * - User is on a path without biometrics (mobileWithoutBiometrics strategy)
     *
     * @param password The password to store
     * @throws Error if biometric authentication is not available (Android: requires biometrics)
     */
    setPassword: (password: AuthSecret): void => {
      if (!canUseBiometrics) {
        throw new Error(
          'SecureStorePasswordManager requires biometric authentication to be available. ' +
            'On Android, actual biometrics (fingerprint/face) must be enrolled - PIN alone is not sufficient.',
        );
      }

      const passwordHex = HexBytes.fromByteArray(password);

      // Store with hardware-backed protection
      secureStore.setItem(PASSWORD_HEX_KEY, passwordHex, {
        requireAuthentication: true,
        authenticationPrompt: getI18n().t(
          'authentication-prompt.local-auth-message.setup',
        ),
      });

      // Set flag for existence check
      passwordFlagManager.setBiometricPasswordEnabled(true);
    },

    /**
     * Retrieves the stored password with OS-level authentication.
     *
     * IMPORTANT: This WILL trigger an OS biometric/passcode prompt.
     * The OS handles the authentication automatically - no separate
     * expo-local-authentication call is needed.
     *
     * @returns The stored AuthSecret
     * @throws Error if:
     *   - No password is stored
     *   - User cancels the biometric prompt
     *   - User fails authentication
     *   - Device authentication is no longer available
     */
    getPassword: ({ purpose }: { purpose: AuthPromptPurpose }): AuthSecret => {
      const passwordHex = secureStore.getItem(PASSWORD_HEX_KEY, {
        requireAuthentication: true,
        authenticationPrompt:
          purpose === 'wallet-unlock'
            ? getI18n().t('authentication-prompt.local-auth-message.unlock')
            : getI18n().t('authentication-prompt.local-auth-message.confirm'),
      });

      if (!passwordHex) {
        throw new Error('No password stored in secure store');
      }

      return AuthSecret.fromHex(HexBytes(passwordHex));
    },

    /**
     * Deletes the stored password and clears the existence flag.
     */
    deletePassword: async (): Promise<void> => {
      await secureStore.deleteItemAsync(PASSWORD_HEX_KEY);
      passwordFlagManager.clearBiometricPasswordFlag();
    },

    /**
     * Checks if a biometric-protected password has been stored.
     *
     * This does NOT trigger any authentication prompt - it only checks
     * the existence flag that was set when the password was stored.
     *
     * @returns true if a biometric password exists, false otherwise
     */
    hasStoredPassword: (): boolean => {
      return passwordFlagManager.isBiometricPasswordEnabled();
    },

    /**
     * Clears the password existence flag without deleting the password.
     *
     * Used when the password becomes inaccessible (e.g., user removed
     * device authentication) but we can't delete it because we can't
     * access it.
     */
    clearPasswordFlag: (): void => {
      passwordFlagManager.clearBiometricPasswordFlag();
    },
  };
};

export type SecureStorePasswordManager = ReturnType<
  typeof createSecureStorePasswordManager
>;
