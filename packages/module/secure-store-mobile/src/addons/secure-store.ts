import * as LocalAuthentication from 'expo-local-authentication';
import {
  canUseBiometricAuthentication as expoCanUseBiometricAuthentication,
  deleteItemAsync,
  getItem,
  isAvailableAsync,
  setItem,
} from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { SecureStore } from '@lace-contract/secure-store';

/**
 * Checks if STRONG biometrics (Class 3) are enrolled using expo-secure-store's
 * native check.
 *
 * IMPORTANT: expo-local-authentication's getEnrolledLevelAsync() does NOT
 * distinguish between Class 2 (weak) and Class 3 (strong) biometrics.
 * It returns BIOMETRIC for ANY biometric, including weak face recognition.
 *
 * expo-secure-store's canUseBiometricAuthentication() on Android uses
 * BiometricManager.canAuthenticate(BIOMETRIC_STRONG) which correctly checks
 * for Class 3 biometrics only.
 *
 * Android Keystore with `setUserAuthenticationRequired(true)` requires
 * BIOMETRIC_STRONG (Class 3). This typically means:
 * - Fingerprint: Usually Class 3 ✓
 * - Face: Often Class 2 (BIOMETRIC_WEAK) on most devices ✗
 */
const checkStrongBiometricsEnrolled = (): boolean => {
  // Use expo-secure-store's native check which correctly uses BIOMETRIC_STRONG
  return expoCanUseBiometricAuthentication();
};

/**
 * Checks if device authentication (biometric OR passcode) is available.
 * Uses getEnrolledLevelAsync() to detect PIN-only vs biometric enrollment.
 */
const checkDeviceAuthAvailable = async (): Promise<boolean> => {
  try {
    // Check if there's any device authentication (biometric or PIN)
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    const hasDeviceAuth = level !== LocalAuthentication.SecurityLevel.NONE;
    return hasDeviceAuth;
  } catch {
    return expoCanUseBiometricAuthentication();
  }
};

/**
 * Determines if we can use `requireAuthentication: true` with secure store.
 *
 * Platform-specific behavior:
 * - iOS: Works with passcode OR biometrics (returns true if either is available)
 * - Android: ONLY works with STRONG biometrics (Class 3) enrolled
 *   - Fingerprint: Usually Class 3 ✓
 *   - Face: Usually Class 2 (weak) on most devices ✗
 *   - PIN-only: NOT sufficient ✗
 *
 * This check is performed fresh each time to handle cases where the user
 * adds/removes biometrics while the app is running.
 */
const canUseRequireAuthentication = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    // iOS: passcode is sufficient for requireAuthentication
    return checkDeviceAuthAvailable();
  } else {
    // Android: Use expo-secure-store's native check for BIOMETRIC_STRONG
    // This correctly distinguishes between Class 2 (weak face) and Class 3 (fingerprint)
    return checkStrongBiometricsEnrolled();
  }
};

// Cache the initial check result, but refresh it on each call
const authCache = { canUseRequireAuth: null as boolean | null };

/**
 * Synchronously returns the cached result of canUseRequireAuthentication.
 * Also triggers an async refresh for the next call.
 *
 * This is a workaround because the SecureStore interface expects a sync function,
 * but the actual check is async. We cache the result and refresh it periodically.
 */
const canUseBiometricAuthenticationSync = (): boolean => {
  // Trigger async refresh for next call (fire and forget)
  canUseRequireAuthentication()
    .then(canUse => {
      authCache.canUseRequireAuth = canUse;
    })
    .catch(() => {
      // Ignore errors - keep existing cached value
    });

  return authCache.canUseRequireAuth ?? false;
};

const loadSecureStore: ContextualLaceInit<
  SecureStore,
  AvailableAddons
> = async () => {
  // Initialize the cache with the current state
  authCache.canUseRequireAuth = await canUseRequireAuthentication();

  return {
    // Returns cached value, refreshes cache on each call
    canUseBiometricAuthentication: canUseBiometricAuthenticationSync,
    deleteItemAsync,
    getItem,
    // Refresh cache before returning availability
    isAvailableAsync: async () => {
      authCache.canUseRequireAuth = await canUseRequireAuthentication();
      return isAvailableAsync();
    },
    setItem,
  };
};

export default loadSecureStore;
