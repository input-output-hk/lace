import {
  AuthSecret,
  createSecureStorePasswordManager,
} from '@lace-contract/authentication-prompt';

import type { PasswordStrategyResult } from './types';
import type { LacePlatform } from '@lace-contract/module';
import type { SecureStore } from '@lace-contract/secure-store';
import type { Logger } from 'ts-log';

const strategies = {
  /** Web platform: Use user-provided password directly. */
  web: async (userPassword: string): Promise<PasswordStrategyResult> => ({
    success: true,
    authSecret: AuthSecret.fromUTF8(userPassword),
  }),

  /**
   * Mobile without biometrics: Use user-provided password.
   * Password is NOT stored in secure storage (would defeat security fix).
   */
  mobileWithoutBiometrics: async (
    userPassword: string,
    _secureStore: SecureStore | undefined,
    logger: Logger,
  ): Promise<PasswordStrategyResult> => {
    if (!userPassword || userPassword.trim().length === 0) {
      logger.error('Password is required when biometrics are not available');
      return {
        success: false,
        error: 'Password is required when biometrics are not available',
      };
    }

    logger.debug(
      'Password NOT stored in secure storage (biometrics not available)',
    );
    return { success: true, authSecret: AuthSecret.fromUTF8(userPassword) };
  },
  /**
   * Mobile with biometrics: use the user's own password as the authSecret,
   * and ALSO store it in secure storage under biometric protection.
   * At unlock time, the OS biometric prompt retrieves it automatically.
   * If biometrics fail the user falls back to typing their password manually.
   */
  mobileWithBiometricsAndPassword: async (
    userPassword: string,
    secureStore: SecureStore,
    logger: Logger,
  ): Promise<PasswordStrategyResult> => {
    if (!userPassword || userPassword.trim().length === 0) {
      logger.error(
        'Password is required for mobileWithBiometricsAndPassword strategy',
      );
      return {
        success: false,
        error: 'Password is required',
      };
    }

    const authSecret = AuthSecret.fromUTF8(userPassword);

    // Store user's password in the secure store under biometric/passcode protection.
    // The OS will require biometric (or passcode on iOS) to retrieve it at unlock time.
    // This is best-effort: if it fails the wallet still works via manual password entry.
    try {
      const passwordManager = createSecureStorePasswordManager(secureStore);
      passwordManager.setPassword(authSecret);
      logger.debug(
        'User password stored in secure storage with OS-level biometric protection',
      );
    } catch (error) {
      logger.warn(
        'Could not store password in secure store — biometric unlock unavailable, ' +
          'manual password entry will be required',
        error,
      );
      // Non-fatal: the wallet is created with the user's password regardless.
      // The user will use the password-entry path at unlock time.
    }

    return { success: true, authSecret };
  },
};

export type PasswordStrategy = keyof typeof strategies;

export const selectPasswordStrategy = (
  platform: LacePlatform,
  canUseSecureStoreWithAuth: boolean,
): PasswordStrategy => {
  if (platform === 'web' || platform === 'web-extension') return 'web';
  if (canUseSecureStoreWithAuth) return 'mobileWithBiometricsAndPassword';
  return 'mobileWithoutBiometrics';
};

interface ExecutePasswordStrategyOptions {
  strategy: PasswordStrategy;
  password: string;
  secureStore: SecureStore | undefined;
  logger: Logger;
}

export const executePasswordStrategy = async ({
  strategy,
  password,
  secureStore,
  logger,
}: ExecutePasswordStrategyOptions): Promise<PasswordStrategyResult> => {
  switch (strategy) {
    case 'web':
      return strategies.web(password);
    case 'mobileWithoutBiometrics':
      return strategies.mobileWithoutBiometrics(password, secureStore, logger);
    case 'mobileWithBiometricsAndPassword':
      if (!secureStore) {
        return Promise.resolve({
          success: false,
          error: 'Secure storage not available',
          retryable: false,
        });
      }
      return strategies.mobileWithBiometricsAndPassword(
        password,
        secureStore,
        logger,
      );
  }
};
