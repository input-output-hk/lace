import * as ExpoLocalAuth from 'expo-local-authentication';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';

import type { LocalAuthenticationDependency } from '@lace-contract/authentication-prompt';

export const sideEffectDependencies = {
  localAuthentication: {
    getEnrolledLevel: () =>
      from(ExpoLocalAuth.getEnrolledLevelAsync()).pipe(
        map(level =>
          level === ExpoLocalAuth.SecurityLevel.NONE
            ? 'none'
            : level === ExpoLocalAuth.SecurityLevel.SECRET
            ? 'secret'
            : 'biometric',
        ),
      ),
    authenticate: options =>
      from(ExpoLocalAuth.authenticateAsync(options)).pipe(
        map(result =>
          result.success
            ? { success: true as const }
            : { success: false as const, error: result.error ?? 'unknown' },
        ),
      ),
    isEnrolled: () => from(ExpoLocalAuth.isEnrolledAsync()),
  } satisfies LocalAuthenticationDependency,
};
