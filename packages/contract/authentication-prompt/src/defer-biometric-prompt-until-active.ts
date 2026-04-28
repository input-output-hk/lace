import type { Observable } from 'rxjs';

/**
 * Host-provided signal that OS-level biometrics may be shown (e.g. React Native AppState active).
 * Used so wallet-unlock autofill does not call secure-store biometric read while backgrounded.
 */
export type DeferBiometricPromptUntilActiveExtension = {
  createWaitUntilBiometricPromptAllowed: () => Observable<void>;
};
