import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import type { LocalAuthenticationDependency } from '../../local-authentication';
import type { Observable } from 'rxjs';

/**
 * Interface for checking device authentication availability.
 *
 */
export type DeviceAuthChecker = {
  /**
   * Checks if any form of device authentication is available.
   * This includes biometric (Face ID, Touch ID, fingerprint) OR
   * device passcode/PIN.
   *
   * @returns Observable<boolean> - true if device auth is available
   */
  isAvailable: () => Observable<boolean>;
};

/**
 * Creates a device auth checker that can check device authentication availability.
 *
 * Uses LocalAuthenticationDependency to check the enrolled security level on the device.
 *
 * @returns DeviceAuthChecker instance
 */
export const createDeviceAuthChecker = (
  localAuth: LocalAuthenticationDependency,
): DeviceAuthChecker => ({
  /**
   * Checks if any form of device authentication is available (biometric OR passcode/PIN).
   *
   * Uses localAuth.getEnrolledLevel() which returns:
   * - 'none': No device authentication is set up
   * - 'secret': Device has passcode/PIN only
   * - 'biometric': Device has biometric authentication (may also have passcode)
   *
   * We consider both 'secret' and 'biometric' as "available" since expo-secure-store
   * with requireAuthentication: true will accept either.
   */
  isAvailable: () =>
    localAuth.getEnrolledLevel().pipe(
      map(level => level !== 'none'),
      catchError(() => of(false)),
    ),
});
