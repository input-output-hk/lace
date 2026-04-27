import { of } from 'rxjs';

import { AuthSecret } from './value-objects';

import type { AccessAuthSecret, Authenticate } from './store/types';

export const getTestAuthSecretDeps = () => {
  const authSecret = AuthSecret.fromUTF8('password');
  const internalAuthSecretBus$ = of(authSecret);
  const accessAuthSecret: AccessAuthSecret = callback => callback(authSecret);
  const accessSecretFromAuthFlow: AccessAuthSecret = callback =>
    callback(authSecret);
  const authenticate: Authenticate = () => of(true);
  return {
    internalAuthSecretBus$,
    accessAuthSecret,
    accessSecretFromAuthFlow,
    authenticate,
  };
};
