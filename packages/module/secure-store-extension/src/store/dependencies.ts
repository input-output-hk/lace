import { of } from 'rxjs';

import type { LocalAuthenticationDependency } from '@lace-contract/authentication-prompt';

export const sideEffectDependencies = {
  localAuthentication: {
    getEnrolledLevel: () => of('none' as const),
    authenticate: () => of({ success: false as const, error: 'not_supported' }),
    isEnrolled: () => of(false),
  } satisfies LocalAuthenticationDependency,
};
