import type { Observable } from 'rxjs';

export type LocalAuthSecurityLevel = 'biometric' | 'none' | 'secret';
export type LocalAuthenticateResult =
  | { success: false; error: string }
  | { success: true };

export type LocalAuthenticationDependency = {
  getEnrolledLevel: () => Observable<LocalAuthSecurityLevel>;
  authenticate: (options: {
    promptMessage: string;
    disableDeviceFallback?: boolean;
    cancelLabel?: string;
  }) => Observable<LocalAuthenticateResult>;
  isEnrolled: () => Observable<boolean>;
};
