import type { SecureStore } from '@lace-contract/secure-store';

// SecureStore keys must contain only alphanumeric characters, ".", "-", and "_"
const BIOMETRIC_PASSWORD_ENABLED_KEY = 'lace.biometricPasswordEnabled';

/**
 * Utility for managing the biometric password existence flag.
 *
 * This flag indicates whether a biometric-protected password has been stored.
 * It's stored separately from the actual password to allow checking existence
 * without triggering OS authentication.
 *
 * The flag itself is NOT sensitive - it only indicates "yes, a biometric password
 * exists" and is stored with `requireAuthentication: false`.
 *
 * The actual `passwordHex` is stored with `requireAuthentication: true` and
 * requires OS biometric/passcode authentication to access.
 */
export const createPasswordFlagManager = (secureStore: SecureStore) => {
  return {
    /**
     * Sets the flag indicating a biometric-protected password has been stored.
     * Called during onboarding after successfully storing passwordHex.
     */
    setBiometricPasswordEnabled: (enabled: boolean): void => {
      if (enabled) {
        secureStore.setItem(BIOMETRIC_PASSWORD_ENABLED_KEY, 'true', {
          requireAuthentication: false,
        });
      } else {
        // Delete the flag - use sync version if available, otherwise fire-and-forget
        void secureStore.deleteItemAsync(BIOMETRIC_PASSWORD_ENABLED_KEY);
      }
    },

    /**
     * Checks if a biometric-protected password was previously stored.
     * Does NOT trigger any authentication prompt.
     *
     * @returns true if the biometric password flag is set, false otherwise
     */
    isBiometricPasswordEnabled: (): boolean => {
      try {
        const value = secureStore.getItem(BIOMETRIC_PASSWORD_ENABLED_KEY, {
          requireAuthentication: false,
        });
        return value === 'true';
      } catch {
        return false;
      }
    },

    /**
     * Clears the biometric password flag.
     * Should be called when:
     * - Password is explicitly deleted
     * - Password becomes inaccessible (device auth removed by user)
     * - User restores wallet (new password will be created)
     */
    clearBiometricPasswordFlag: (): void => {
      void secureStore.deleteItemAsync(BIOMETRIC_PASSWORD_ENABLED_KEY);
    },
  };
};

export type PasswordFlagManager = ReturnType<typeof createPasswordFlagManager>;
