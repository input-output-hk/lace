import { firstStateOfStatus } from '@lace-lib/util-store';
import {
  of,
  switchMap,
  catchError,
  from,
  firstValueFrom,
  mergeMap,
} from 'rxjs';

import { createSecureStorePasswordManager } from '../../authenticators/password/secure-store-password-manager';

import type {
  AuthenticationPromptSliceState,
  AuthPromptPurpose,
} from '../types';
import type { VerifyAndPropagateAuthSecret } from './auth-verification-handler';
import type { SideEffect } from '../../contract';
import type { LocalAuthenticationDependency } from '../../local-authentication';
import type { AuthSecret } from '../../value-objects';
import type { LacePlatform } from '@lace-contract/module';
import type { SecureStore } from '@lace-contract/secure-store';
import type { Observable } from 'rxjs';

/**
 * Maximum number of "unknown" error retries before forcing password recovery.
 * This prevents infinite loops caused by Android Keystore PIN fallback bug.
 * @see https://issuetracker.google.com/issues/147374428
 */
const MAX_UNKNOWN_ERROR_RETRIES = 3;

/**
 * Error message patterns for classifying secure store errors.
 * These are platform-dependent strings that help determine the appropriate action.
 */
const ERROR_PATTERNS = {
  // Device authentication unavailable patterns
  NOT_AVAILABLE: [
    'no user authentication method configured', // iOS
    'no user authentication method', // iOS variant
    'no secure lock screen',
    'no authentication methods',
    'secure lock screen must be enabled',
    'user authentication required', // Android
    'no enrolled', // Android: No enrolled credentials
  ],
  // User cancelled patterns
  CANCELLED: [
    'cancel',
    'user denied',
    'user rejected',
    'user chose', // Android: "User chose not to use"
  ],
  // Biometric lockout patterns
  LOCKOUT: [
    'too many attempts',
    'lockout',
    'locked out',
    'biometric locked',
    'temporarily disabled',
    'try again later',
    'key permanently invalidated', // Android: biometrics changed
    'permanently invalidated',
    'invalidated',
  ],
  // Authentication failed patterns
  AUTH_FAILED: [
    'authentication failed',
    'auth failed',
    'key user not authenticated', // Android: auth needed
  ],
  // Password not found patterns
  NOT_FOUND: [
    'no password stored',
    'could not find',
    'does not exist',
    'no value',
    'null',
  ],
  // Android Keystore bug patterns
  ANDROID_KEYSTORE_BUG: ['could not decrypt', 'could not encrypt'],
} as const;

/**
 * Result of Android biometrics-only pre-authentication.
 */
type PreAuthResult =
  | { success: false; reason: 'cancelled' | 'failed' | 'lockout' }
  | { success: true };

/**
 * Error types that can occur when retrieving a biometric-protected password.
 */
type PasswordRetrievalErrorType =
  | 'auth_failed' // User failed biometric/passcode authentication (single attempt)
  | 'cancelled' // User cancelled the biometric/passcode prompt
  | 'lockout' // User failed too many times - biometric lockout
  | 'not_available' // Device authentication is no longer available
  | 'not_found' // Password doesn't exist in secure store
  | 'unknown'; // Unknown error

/**
 * Result of attempting to retrieve a biometric-protected password.
 */
type PasswordRetrievalResult =
  | { success: false; errorType: PasswordRetrievalErrorType; error: Error }
  | { success: true; password: AuthSecret };

/**
 * Configuration parameters for creating the biometric authentication side effect.
 */
type MakeAuthenticationBiometricVerifyingParams = {
  /** Pre-configured function that handles authentication verification and propagation */
  verifyAndPropagateAuthSecret: VerifyAndPropagateAuthSecret;
  /** Platform the app is running on */
  platform: LacePlatform;
  sendAuthSecretInternally: (authSecret: AuthSecret) => Observable<void>;
};

/**
 * Actions needed for handling password retrieval results.
 */
type PasswordRetrievalActions = {
  verifiedBiometric: (payload: {
    success: boolean;
    androidKeystoreRecovery?: { attemptNumber: number; maxAttempts: number };
  }) => unknown;
  biometricCanceled: () => unknown;
};

/**
 * Options for biometric pre-authentication prompt.
 */
type PreAuthOptions = {
  promptMessage: string;
  cancelLabel: string;
};

/**
 * Context for handling password retrieval results.
 * Groups related dependencies to reduce parameter count.
 */
type PasswordRetrievalContext = {
  secureStore: SecureStore;
  sendAuthSecretInternally: (authSecret: AuthSecret) => Observable<void>;
  selectState$: Observable<AuthenticationPromptSliceState>;
  authenticationPrompt: PasswordRetrievalActions;
  verifyAndPropagateAuthSecret: VerifyAndPropagateAuthSecret;
  retryState: RetryStateManager;
  platform: LacePlatform;
  localAuth: LocalAuthenticationDependency;
  purpose: AuthPromptPurpose;
};

/**
 * State manager for tracking retry attempts during authentication.
 * Created per side-effect instance to isolate state between different
 * authentication sessions and improve testability.
 */
type RetryStateManager = {
  reset: () => void;
  increment: () => number;
  get: () => number;
};

/**
 * Creates a retry state manager that uses the module-level retry state.
 * This ensures retry counts persist across VerifyingBiometric state re-entries.
 */
const createRetryStateManager = (): RetryStateManager => {
  return {
    reset: () => {
      moduleRetryState.count = 0;
    },
    increment: () => {
      moduleRetryState.count++;
      return moduleRetryState.count;
    },
    get: () => moduleRetryState.count,
  };
};

/**
 * Module-level concurrency guard to prevent concurrent biometric prompts.
 * This must be module-level because:
 * 1. Multiple side-effect instances could try to show prompts simultaneously
 * 2. The OS can only show one biometric prompt at a time
 * 3. Concurrent attempts would fail with confusing errors
 *
 * Note: This is properly managed with try/finally in androidBiometricPreAuth.
 * For testing, use resetPreAuthState() to reset between tests.
 */
const preAuthState = { isInProgress: false };

/**
 * Module-level retry counter for Android Keystore bug recovery.
 * This must be module-level because:
 * 1. The VerifyingBiometric state can be re-entered multiple times
 * 2. Each re-entry creates a new Observable subscription
 * 3. The retry count must persist across these re-entries
 *
 * For testing, use resetBiometricRetryState() to reset between tests.
 */
const moduleRetryState = { count: 0 };

/**
 * Resets the pre-auth concurrency guard.
 * @internal Exported only for testing - do not use in production code.
 */
export const resetPreAuthState = (): void => {
  preAuthState.isInProgress = false;
};

/**
 * Resets the biometric retry state.
 * @internal Exported only for testing - do not use in production code.
 */
export const resetBiometricRetryState = (): void => {
  moduleRetryState.count = 0;
};

/**
 * Safely clears the biometric password flag.
 * Does not throw if clearing fails.
 */
const tryClearPasswordFlag = (secureStore: SecureStore): void => {
  try {
    const passwordManager = createSecureStorePasswordManager(secureStore);
    passwordManager.clearPasswordFlag();
  } catch {
    // Silently handle error - clearing the flag is a best-effort operation
  }
};

/**
 * Checks if a message contains any of the given patterns.
 */
const matchesPatterns = (
  message: string,
  patterns: readonly string[],
): boolean => patterns.some(pattern => message.includes(pattern));

/**
 * Checks if the current error is the Android Keystore PIN fallback bug.
 * This specific error occurs when:
 * 1. User's biometric fails
 * 2. User falls back to PIN within the BiometricPrompt
 * 3. Keystore rejects the operation with "unknown" error
 *
 * @see https://issuetracker.google.com/issues/147374428
 */
const isAndroidKeystorePinFallbackBug = (
  error: Error,
  platform: LacePlatform,
): boolean => {
  if (platform !== 'android') {
    return false;
  }

  const message = error.message.toLowerCase();
  const isMatchingKeystoreBug = matchesPatterns(
    message,
    ERROR_PATTERNS.ANDROID_KEYSTORE_BUG,
  );
  const hasUnknownCause = message.includes('caused by: unknown');

  return isMatchingKeystoreBug && hasUnknownCause;
};

/**
 * Discriminates secure store errors to determine the appropriate action.
 *
 * expo-secure-store error messages (platform-dependent):
 * - iOS: "User canceled authentication" when user presses cancel
 * - iOS: "Authentication failed" when biometric/passcode fails
 * - iOS: "no user authentication method configured" when passcode removed
 * - Android: "User canceled" or similar for cancellation
 * - Android: "Key permanently invalidated" when biometrics change
 * - Android: "has been rejected" when device auth is removed
 *
 * IMPORTANT: We are CONSERVATIVE about falling back to password prompt.
 * We only do that for clear "not_found" or "not_available" cases.
 * Most errors should allow retry since the OS will handle showing the
 * appropriate auth method (PIN fallback, etc.)
 */
const discriminateSecureStoreError = (
  error: unknown,
  platform: LacePlatform,
): PasswordRetrievalErrorType => {
  if (!(error instanceof Error)) {
    return 'unknown';
  }

  const message = error.message.toLowerCase();

  // CRITICAL: Check for Android Keystore PIN fallback bug FIRST
  // This must be checked before NOT_AVAILABLE because both can have "has been rejected"
  // but the Keystore bug has a specific pattern we can identify
  if (
    platform === 'android' &&
    matchesPatterns(message, ERROR_PATTERNS.ANDROID_KEYSTORE_BUG) &&
    message.includes('caused by: unknown')
  ) {
    return 'unknown';
  }

  // Check for device auth unavailable
  // This happens when user removes passcode/biometrics after setting up the wallet
  if (
    matchesPatterns(message, ERROR_PATTERNS.NOT_AVAILABLE) ||
    // Android: Keystore rejection (not user cancel, and not Keystore bug)
    (message.includes('has been rejected') && !message.includes('cancel'))
  ) {
    return 'not_available';
  }

  // User cancelled the prompt
  if (matchesPatterns(message, ERROR_PATTERNS.CANCELLED)) {
    return 'cancelled';
  }

  // Biometric lockout - user failed too many attempts
  if (matchesPatterns(message, ERROR_PATTERNS.LOCKOUT)) {
    return 'lockout';
  }

  // Authentication failed (wrong biometric/passcode) - single attempt
  if (matchesPatterns(message, ERROR_PATTERNS.AUTH_FAILED)) {
    return 'auth_failed';
  }

  // Password doesn't exist
  if (matchesPatterns(message, ERROR_PATTERNS.NOT_FOUND)) {
    return 'not_found';
  }

  // Default to unknown - which allows retry
  // This is intentionally permissive to avoid locking users out
  return 'unknown';
};

/**
 * Pre-authenticates the user with biometrics-only on Android.
 *
 * This avoids the Android Keystore PIN fallback bug by verifying biometrics
 * work BEFORE attempting to retrieve the password from Keystore.
 *
 * @see https://issuetracker.google.com/issues/147374428
 */
const androidBiometricPreAuth = async (
  localAuth: LocalAuthenticationDependency,
  options: PreAuthOptions,
): Promise<PreAuthResult> => {
  // Prevent concurrent calls
  if (preAuthState.isInProgress) {
    return { success: false, reason: 'cancelled' };
  }

  preAuthState.isInProgress = true;
  try {
    const result = await firstValueFrom(
      localAuth.authenticate({
        promptMessage: options.promptMessage,
        disableDeviceFallback: true, // ← Critical: No PIN option
        cancelLabel: options.cancelLabel,
      }),
    );

    if (result.success) {
      return { success: true };
    }

    if (result.error === 'lockout') {
      return { success: false, reason: 'lockout' };
    }

    if (result.error === 'user_cancel' || result.error === 'system_cancel') {
      return { success: false, reason: 'cancelled' };
    }

    return { success: false, reason: 'failed' };
  } catch {
    return { success: false, reason: 'failed' };
  } finally {
    preAuthState.isInProgress = false;
  }
};

/**
 * Attempts to retrieve the biometric-protected password from secure storage.
 *
 * This function will trigger the OS biometric/passcode prompt automatically
 * because the password is stored with `requireAuthentication: true`.
 */
const retrievePasswordWithOSAuth = (
  secureStore: SecureStore,
  platform: LacePlatform,
  purpose: AuthPromptPurpose,
): PasswordRetrievalResult => {
  try {
    const passwordManager = createSecureStorePasswordManager(secureStore);
    const password = passwordManager.getPassword({ purpose });
    return { success: true, password };
  } catch (error) {
    const errorType = discriminateSecureStoreError(error, platform);
    return {
      success: false,
      errorType,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

/**
 * Handles successful password retrieval.
 */
const handleSuccessfulRetrieval = (
  password: AuthSecret,
  context: PasswordRetrievalContext,
): Observable<unknown> => {
  context.retryState.reset();
  return context.sendAuthSecretInternally(password).pipe(
    switchMap(() =>
      context.verifyAndPropagateAuthSecret({
        selectAuthenticationPromptState$: context.selectState$,
        actionCreator: context.authenticationPrompt.verifiedBiometric,
      }),
    ),
    catchError(() => {
      return of(
        context.authenticationPrompt.verifiedBiometric({ success: false }),
      );
    }),
  );
};

/**
 * Handles lockout error - user failed biometrics too many times.
 * Falls back to password prompt instead of blocking the user.
 */
const handleLockoutError = (
  context: PasswordRetrievalContext,
): Observable<unknown> => {
  context.retryState.reset();
  tryClearPasswordFlag(context.secureStore);
  return of(context.authenticationPrompt.biometricCanceled());
};

/**
 * Handles unknown error with retry logic.
 * After max retries, falls back to password prompt.
 */
const handleUnknownError = (
  _error: Error,
  context: PasswordRetrievalContext,
): Observable<unknown> => {
  const retryCount = context.retryState.increment();

  if (
    context.platform === 'android' &&
    retryCount >= MAX_UNKNOWN_ERROR_RETRIES
  ) {
    context.retryState.reset();
    tryClearPasswordFlag(context.secureStore);
    return of(context.authenticationPrompt.biometricCanceled());
  }

  return of(context.authenticationPrompt.verifiedBiometric({ success: false }));
};

/**
 * Handles not_available error - device auth is no longer available.
 * Falls back to password prompt.
 */
const handleNotAvailableError = (
  context: PasswordRetrievalContext,
): Observable<unknown> => {
  context.retryState.reset();
  tryClearPasswordFlag(context.secureStore);
  return of(context.authenticationPrompt.biometricCanceled());
};

/**
 * Handles not_found error - password doesn't exist in secure store.
 * Falls back to password prompt.
 */
const handleNotFoundError = (
  context: PasswordRetrievalContext,
): Observable<unknown> => {
  context.retryState.reset();
  tryClearPasswordFlag(context.secureStore);
  return of(context.authenticationPrompt.biometricCanceled());
};

/**
 * Handles the result of password retrieval from secure storage.
 */
const handlePasswordRetrievalResult = (
  result: PasswordRetrievalResult,
  context: PasswordRetrievalContext,
): Observable<unknown> => {
  if (result.success) {
    return handleSuccessfulRetrieval(result.password, context);
  }

  switch (result.errorType) {
    case 'cancelled':
      context.retryState.reset();
      return of(context.authenticationPrompt.biometricCanceled());

    case 'auth_failed':
      return of(
        context.authenticationPrompt.verifiedBiometric({ success: false }),
      );

    case 'lockout':
      return handleLockoutError(context);

    case 'unknown':
      return handleUnknownError(result.error, context);

    case 'not_available':
      return handleNotAvailableError(context);

    case 'not_found':
      return handleNotFoundError(context);
  }
};

/**
 * Handles Android pre-auth failure with retry tracking.
 *
 * - lockout: Immediately go to password recovery
 * - failed/cancelled: Check retry count, go to recovery after MAX_UNKNOWN_ERROR_RETRIES
 *
 * NOTE: We count cancellations toward the retry limit because once the Keystore
 * is in the "PIN fallback bug" state, direct retrieval will ALWAYS fail.
 * This prevents infinite loops where user keeps cancelling.
 */
const handlePreAuthFailure = (
  reason: 'cancelled' | 'failed' | 'lockout',
  context: PasswordRetrievalContext,
): Observable<unknown> => {
  if (reason === 'lockout') {
    context.retryState.reset();
    tryClearPasswordFlag(context.secureStore);
    return of(context.authenticationPrompt.biometricCanceled());
  }

  // Both 'failed' and 'cancelled' count toward retry limit
  // This prevents infinite loops since Keystore will always fail once in broken state
  if (context.retryState.get() >= MAX_UNKNOWN_ERROR_RETRIES) {
    context.retryState.reset();
    tryClearPasswordFlag(context.secureStore);
    return of(context.authenticationPrompt.biometricCanceled());
  }

  const currentAttempt = context.retryState.get();

  return of(
    context.authenticationPrompt.verifiedBiometric({
      success: false,
      androidKeystoreRecovery: {
        attemptNumber: currentAttempt,
        maxAttempts: MAX_UNKNOWN_ERROR_RETRIES,
      },
    }),
  );
};

/**
 * Handles Android Keystore bug with biometrics-only retry and attempt tracking.
 *
 * Flow:
 * 1. Increment retry counter
 * 2. If exceeded MAX_UNKNOWN_ERROR_RETRIES (3), trigger password recovery
 * 3. Show biometrics-only pre-auth (no PIN fallback)
 * 4. If pre-auth succeeds, retry Keystore retrieval
 * 5. If Keystore still fails after successful pre-auth, trigger recovery
 *
 * This ensures users get 3 chances to authenticate with biometrics before
 * the wallet recovery flow is triggered.
 */
const handleAndroidKeystoreBugRetry = async (
  context: PasswordRetrievalContext,
): Promise<Observable<unknown>> => {
  const retryCount = context.retryState.increment();

  // After max retries, fall back to password prompt
  if (retryCount > MAX_UNKNOWN_ERROR_RETRIES) {
    context.retryState.reset();
    tryClearPasswordFlag(context.secureStore);
    return of(context.authenticationPrompt.biometricCanceled());
  }

  // Show biometrics-only prompt (no PIN fallback option)
  const preAuthResult = await androidBiometricPreAuth(context.localAuth, {
    promptMessage: 'Please verify with biometrics to continue',
    cancelLabel: 'Cancel',
  });

  if (!preAuthResult.success) {
    return handlePreAuthFailure(preAuthResult.reason, context);
  }

  // Pre-auth succeeded - retry Keystore retrieval
  // The Keystore will show another prompt (with PIN fallback), but since user
  // just succeeded with biometrics, they're likely to use biometrics again
  const result = retrievePasswordWithOSAuth(
    context.secureStore,
    context.platform,
    context.purpose,
  );

  if (result.success) {
    context.retryState.reset();
    return handleSuccessfulRetrieval(result.password, context);
  }

  // Handle errors from Keystore retrieval normally
  // Don't immediately go to recovery - user might have cancelled or failed
  // for recoverable reasons
  return handlePasswordRetrievalResult(result, context);
};

/**
 * Side effect that handles the biometric verification state.
 *
 * When the state machine enters 'VerifyingBiometric', this side effect:
 *
 * ANDROID FLOW (Direct-first, pre-auth on bug):
 * 1. Try direct Keystore retrieval (1 prompt)
 * 2. If Android Keystore bug detected → use pre-auth for retry
 * 3. This ensures happy path = 1 prompt
 *
 * iOS FLOW:
 * Direct to Keychain retrieval (Keychain handles PIN fallback correctly)
 */
export const makeAuthenticationBiometricVerifying =
  ({
    verifyAndPropagateAuthSecret,
    platform,
    sendAuthSecretInternally,
  }: MakeAuthenticationBiometricVerifyingParams): SideEffect =>
  (
    _,
    { authenticationPrompt: { selectState$ } },
    { actions: { authenticationPrompt }, secureStore, ...dependencies },
  ) => {
    const { localAuthentication: localAuth } = dependencies;

    // Create retry state per side-effect instance (not module-level)
    // This isolates state between different authentication sessions
    const retryState = createRetryStateManager();

    return firstStateOfStatus(selectState$, 'VerifyingBiometric').pipe(
      switchMap(({ config: { purpose } }) => {
        // Try direct Keystore/Keychain retrieval first (1 prompt)
        // This is the happy path for both Android and iOS
        const result = retrievePasswordWithOSAuth(
          secureStore,
          platform,
          purpose,
        );

        // Context object groups related dependencies for cleaner function signatures
        const context: PasswordRetrievalContext = {
          secureStore,
          sendAuthSecretInternally,
          selectState$,
          authenticationPrompt,
          verifyAndPropagateAuthSecret,
          retryState,
          platform,
          localAuth,
          purpose,
        };

        if (result.success) {
          return handleSuccessfulRetrieval(result.password, context);
        }

        // Check for Android Keystore PIN fallback bug
        const isKeystoreBug =
          platform === 'android' &&
          result.errorType === 'unknown' &&
          isAndroidKeystorePinFallbackBug(result.error, platform);

        if (isKeystoreBug) {
          // Bug detected: User failed biometrics and used PIN
          // Use pre-auth to ensure biometrics-only for retry
          // `handleAndroidKeystoreBugRetry` is async and returns Observables; flatten
          // so the outer stream emits action values, not nested Observable instances.
          return from(handleAndroidKeystoreBugRetry(context)).pipe(
            mergeMap(observable => observable),
          );
        }

        // Handle other errors normally
        return handlePasswordRetrievalResult(result, context);
      }),
    ) as ReturnType<SideEffect>;
  };

// Export for testing - allows tests to create isolated retry state
export { createRetryStateManager };
export type { RetryStateManager };
