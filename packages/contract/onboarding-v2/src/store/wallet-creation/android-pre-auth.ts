import { firstValueFrom } from 'rxjs';

import { PRE_AUTH_CONFIG } from './constants';
import { preAuthGuard } from './guards';

import type { AndroidPreAuthResult } from './types';
import type { LocalAuthenticationDependency } from '@lace-contract/authentication-prompt';
import type { Logger } from 'ts-log';

/**
 * Pre-authenticates the user with biometrics-only on Android.
 *
 * This is necessary because Android's Keystore has a known bug where
 * biometric → PIN fallback can fail with "unknown" errors.
 *
 * @see https://issuetracker.google.com/issues/147374428
 */
export const androidBiometricPreAuth = async (
  localAuth: LocalAuthenticationDependency,
  logger: Logger,
): Promise<AndroidPreAuthResult> => {
  if (!preAuthGuard.tryAcquire()) {
    logger.warn('[AndroidPreAuth] Already in progress, returning cancelled');
    return { success: false, reason: 'cancelled' };
  }

  try {
    const isEnrolled = await firstValueFrom(localAuth.isEnrolled());
    if (!isEnrolled) {
      logger.debug('[AndroidPreAuth] No biometrics enrolled');
      return { success: false, reason: 'not_enrolled' };
    }

    logger.debug('[AndroidPreAuth] Starting biometrics-only authentication');

    const result = await firstValueFrom(
      localAuth.authenticate({
        promptMessage: PRE_AUTH_CONFIG.promptMessage,
        disableDeviceFallback: true,
        cancelLabel: PRE_AUTH_CONFIG.cancelLabel,
      }),
    );

    if (result.success) {
      logger.debug('[AndroidPreAuth] Biometric authentication succeeded');
      return { success: true };
    }

    if (result.error === 'lockout') {
      logger.debug('[AndroidPreAuth] Biometric lockout detected');
      return { success: false, reason: 'lockout' };
    }

    if (result.error === 'user_cancel' || result.error === 'system_cancel') {
      logger.debug('[AndroidPreAuth] User cancelled');
      return { success: false, reason: 'cancelled' };
    }

    logger.debug('[AndroidPreAuth] Biometric failed:', result.error);
    return { success: false, reason: 'failed' };
  } catch (error) {
    logger.error('[AndroidPreAuth] Error:', error);
    return { success: false, reason: 'failed' };
  } finally {
    preAuthGuard.release();
  }
};
