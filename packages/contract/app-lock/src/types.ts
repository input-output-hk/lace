import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { Observable } from 'rxjs';

export type SetupAppLock = (authSecret: AuthSecret) => Observable<boolean>;
