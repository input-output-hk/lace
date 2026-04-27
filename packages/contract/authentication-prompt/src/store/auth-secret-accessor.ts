import { ByteArray } from '@lace-sdk/util';
import { BehaviorSubject, filter, finalize, switchMap, take, tap } from 'rxjs';

import { AuthSecret } from '../value-objects';

import type { AccessAuthSecret } from './types';

const authSecretBus$ = new BehaviorSubject<AuthSecret | null>(null);

export const accessAuthSecret: AccessAuthSecret = callback =>
  authSecretBus$.pipe(
    filter(Boolean),
    take(1),
    switchMap(secret => {
      const clone = AuthSecret(ByteArray.clone(secret));
      return callback(clone).pipe(
        // restricts to one-time auth-secret usage
        tap(() => clone.fill(0)),
        // handles exceptions
        finalize(() => clone.fill(0)),
      );
    }),
  );

export const propagateAuthSecret = (sourceAuthSecret: AuthSecret) => {
  authSecretBus$.next(AuthSecret(ByteArray.clone(sourceAuthSecret)));
};

export const clearAuthSecret = () => {
  const current = authSecretBus$.getValue();
  if (current) current.fill(0);
  authSecretBus$.next(null);
};
