import { Observable, Subject, take } from 'rxjs';

import type { Authenticate, Config } from './types';

type AuthenticateRequest = {
  config: Config;
  result$: Subject<boolean>;
};

export const authenticateRequests$ = new Subject<AuthenticateRequest>();

export const authenticate: Authenticate = ({
  purpose = 'action-authorization',
  ...restConfig
}) =>
  new Observable(subscriber => {
    const result$ = new Subject<boolean>();
    const sub = result$.pipe(take(1)).subscribe(subscriber);
    authenticateRequests$.next({ config: { purpose, ...restConfig }, result$ });
    return sub;
  });
